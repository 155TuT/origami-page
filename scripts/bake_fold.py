"""Fit a reversible pose sequence to a triangulated, square XY crease pattern.

Offline authoring tool. Requires NumPy and SciPy. The objective softly constrains
edge lengths and dihedral angles. It has no collision or layer-order solver.
"""
import argparse
import json
import os
from pathlib import Path

os.environ.setdefault("OPENBLAS_NUM_THREADS", "1")
import numpy as np
from scipy.optimize import least_squares
from scipy.signal import savgol_filter
from scipy.spatial.transform import Rotation

from pack_fold import faces_of, positions


def unit(v):
    return v / np.maximum(np.linalg.norm(v, axis=1, keepdims=True), 1e-12)


def dihedral(points):
    a, b, c, d = points.transpose(1, 0, 2)
    axis = unit(b - a)
    front = unit(np.cross(axis, c-a))
    back = unit(np.cross(d-a, axis))
    return np.arctan2(np.sum(np.cross(front,back)*axis, axis=1), np.sum(front*back, axis=1))


def wrap(angle):
    return (angle+np.pi) % (2*np.pi) - np.pi


def rotation_guide(flat, closed, faces):
    def bases(points):
        a, b, c = points[faces].transpose(1, 0, 2)
        along = unit(b-a)
        normal = unit(np.cross(along, c-a))
        return np.stack([along, np.cross(normal,along), normal], axis=2)

    rotations = Rotation.from_matrix(bases(closed) @ bases(flat).transpose(0, 2, 1)).as_rotvec()
    a = faces.ravel()
    b = np.roll(faces,-1,axis=1).ravel()
    matrix = np.zeros((len(a)+1, len(flat)))
    matrix[np.arange(len(a)), a] = -1
    matrix[np.arange(len(a)), b] = 1
    matrix[-1] = 1/len(flat)
    inverse = np.linalg.pinv(matrix)
    rest = (flat[b]-flat[a]).reshape(-1, 3, 3)

    def guide(t):
        local = Rotation.from_rotvec(t*rotations).as_matrix()
        wanted = np.einsum("tij,tkj->tki", local, rest)
        center = flat.mean(0)*(1-t) + closed.mean(0)*t
        return inverse @ np.vstack([wanted.reshape(-1,3),center])
    return guide


def bake(root, samples, max_fold):
    original = np.array(positions(root))
    xy = original[:, :2]
    span = np.ptp(xy, axis=0)
    if min(span) <= 0 or abs(span[0]/span[1]-1) > .01 or np.ptp(original[:,2]) > 1e-6*max(span):
        raise ValueError("For this solver, supply a flat square in the XY plane")
    flat = np.column_stack([2*(xy-xy.min(0))/span-1, np.zeros(len(xy))])
    faces_of(root, len(flat))
    faces = np.array(root["faces_vertices"])
    cross_z = np.cross(flat[faces[:,1]]-flat[faces[:,0]], flat[faces[:,2]]-flat[faces[:,0]])[:,2]
    if np.min(cross_z) <= 1e-10:
        raise ValueError("The offline solver requires non-degenerate counterclockwise faces")
    assignments = root["edges_assignment"]
    targets = root.get("edges_foldAngle", [None]*len(assignments))
    if not (len(assignments) == len(targets) == len(root["edges_vertices"])):
        raise ValueError("Edge and angle counts differ")
    defaults = {"M":-180, "V":180, "B":0, "F":0}
    targets = [defaults.get(kind) if angle is None else angle for kind,angle in zip(assignments,targets)]
    if any(not isinstance(a,(int,float)) or not np.isfinite(a) or abs(a)>180 for a in targets):
        raise ValueError("All target angles must be numbers in [-180,180]")
    goals = {tuple(sorted(edge)): np.radians(angle) for edge,angle in zip(root["edges_vertices"], targets)}
    adjacent = {}
    for face in faces:
        for a,b,c in zip(face, np.roll(face,-1), np.roll(face,-2)):
            adjacent.setdefault(tuple(sorted((a,b))), []).append((a,b,c))
    if any(len(pair)>2 for pair in adjacent.values()):
        raise ValueError("Non-manifold edge")
    a, b = np.array(list(adjacent)).T
    hinges, angles = [], []
    for edge,pair in adjacent.items():
        if len(pair)==2:
            hinges.append((*pair[0],pair[1][2]))
            angles.append(goals.get(edge,0))
    if not hinges:
        raise ValueError("The sheet has no hinges")
    hinges = np.array(hinges)
    angles = np.array(angles)
    lengths = np.linalg.norm(flat[b]-flat[a], axis=1)
    weights = np.where(angles==0,.9,.5)
    n_edges, n_hinges = len(a), len(hinges)
    dims = np.arange(3)

    def solve_path(guide=None):
        guided = guide is not None
        stiffness = 6 if guided else 7
        anchor_weight = 2.8 if guided else .012
        last = flat.copy()
        result = [last]
        for t in np.linspace(0,1,samples)[1:]:
            target = angles*(t*max_fold)
            anchor = guide(t) if guided else last

            def residual(x):
                p = x.reshape(-1,3)
                strain = stiffness*(np.linalg.norm(p[b]-p[a],axis=1)-lengths)/np.sqrt(lengths)
                phi = dihedral(p[hinges])
                if guided:
                    bend = np.r_[weights*(np.sin(phi)-np.sin(target)), weights*(np.cos(phi)-np.cos(target))]
                else:
                    bend = weights*wrap(phi-target)
                return np.r_[strain,bend,anchor_weight*(p-anchor).ravel()]

            def jacobian(x):
                p = x.reshape(-1,3)
                rows = n_edges+n_hinges*(2 if guided else 1)
                jac = np.zeros((rows+flat.size,flat.size))
                e = np.arange(n_edges)[:,None]
                grad = stiffness*unit(p[b]-p[a])/np.sqrt(lengths)[:,None]
                jac[e,3*a[:,None]+dims] = -grad
                jac[e,3*b[:,None]+dims] = grad
                pts = p[hinges].copy()
                phi = dihedral(pts)
                h = n_edges+np.arange(n_hinges)
                for corner in range(4):
                    for dim in range(3):
                        pts[:,corner,dim] += 1e-7
                        deriv = weights*wrap(dihedral(pts)-phi)/1e-7
                        pts[:,corner,dim] -= 1e-7
                        col = 3*hinges[:,corner]+dim
                        jac[h,col] = np.cos(phi)*deriv if guided else deriv
                        if guided:
                            jac[h+n_hinges,col] = -np.sin(phi)*deriv
                jac[rows:] = np.eye(flat.size)*anchor_weight
                return jac

            fit = least_squares(residual,last.ravel(),jac=jacobian,method="lm",max_nfev=95,ftol=2e-8,xtol=1e-9)
            p = fit.x.reshape(-1,3)
            if not guided:
                u,_,vt = np.linalg.svd((p-p.mean(0)).T @ (flat-flat.mean(0)))
                basis = u @ np.diag([1,1,np.linalg.det(u@vt)]) @ vt
                p = (p-p.mean(0)) @ basis + flat.mean(0)
            last = p
            result.append(p)
        return np.array(result)

    closed = solve_path()[-1]
    path = solve_path(rotation_guide(flat,closed,faces))
    tail = max(2, round((samples-1)*.25))
    blend = np.linspace(0,1,tail+1)[:,None,None]**2
    path[-tail-1:] = path[-tail-1:]*(1-blend)+closed*blend
    path = savgol_filter(path,7,3,axis=0)
    path[0], path[-1] = flat, closed
    strain = np.abs(np.linalg.norm(path[:,b]-path[:,a],axis=2)/lengths-1)
    print(f"Peak mean absolute edge strain: {100*strain.mean(axis=1).max():.2f}%")
    # Return all poses in the input's coordinates, including the common origin.
    scale = np.r_[span, max(span)]/2
    origin = np.r_[xy.min(0)+span/2, original[:,2].mean()]
    return path*scale+origin


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("input", type=Path, help="Only the flat root frame is used")
    parser.add_argument("--out", required=True, type=Path)
    parser.add_argument("--samples", type=int, default=33)
    parser.add_argument("--max-fold", type=float, default=.991)
    args = parser.parse_args()
    if args.samples<7 or not 0<args.max_fold<=1:
        parser.error("Use at least seven samples and a maximum fold fraction in (0,1]")
    if args.input.resolve()==args.out.resolve():
        parser.error("Choose a separate output for the candidate poses")
    root = json.loads(args.input.read_text(encoding="utf-8-sig"))
    root.pop("file_frames",None)
    frames = bake(root,args.samples,args.max_fold)
    root["file_frames"] = [
        {"frame_parent":0,"frame_inherit":True,"frame_classes":["foldedForm"],
         "frame_attributes":["3D"],"vertices_coords":np.round(p,8).tolist()}
        for p in frames[1:]
    ]
    args.out.write_text(json.dumps(root,ensure_ascii=False,separators=(",",":"))+"\n",encoding="utf-8")
    print(f"Wrote {len(frames)} poses to {args.out}")


if __name__ == "__main__":
    main()
