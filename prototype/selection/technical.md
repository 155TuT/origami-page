沿纸边折回，记下起点和终点。用 `dx`、`dy` 表示两个方向的位移，折线长度就是 $d=\sqrt{\mathtt{dx}^2+\mathtt{dy}^2}$。

```js
// 折线长度
function length(dx, dy) {
  return Math.hypot(dx, dy);
}
```

一条折线有 $n$ 段时，把每段的长度加在一起。

$$
L=\sum_{i=1}^{n}\sqrt{(x_i-x_{i-1})^2+(y_i-y_{i-1})^2}\quad\text{（总长度）}
$$
