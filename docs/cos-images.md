# 折间的腾讯云 COS 图床

折间计划在腾讯云统一管理域名、DNS 解析和图床。现有文章配图和友链头像随站点从 `public/media/` 发布。迁移时保留目录和文件名，在原路径前加上图片子域名。下文以广州地域为例，操作时换成自己的域名、桶名和地域。

## 准备域名和备案

个人备案要用本人实名认证、在有效期内的域名，后缀须经工信部批准。可以在腾讯云注册新域名，也可以使用其他境内合规注册商管理的已有域名。[备案域名要求](https://cloud.tencent.com/document/product/243/18905)

主站使用腾讯云中国内地资源对外提供服务时，先办理网站 ICP 备案。首次备案要关联符合条件的接入资源，例如承载主站的轻量应用服务器。COS 存储桶用来存图，绑定图片子域名时核验网站备案结果。[备案云资源](https://cloud.tencent.com/document/product/243/18908) · [首次备案流程](https://cloud.tencent.com/document/product/243/37402)

## 用一张文章插图接通图床

1. 在 COS 控制台创建专放公开图片的存储桶。示例地域为广州（`ap-guangzhou`），桶名为 `fold-journal-media`。控制台会在名称后加上账号的 APPID，例如 `fold-journal-media-1250000000`。权限选「公有读私有写」，让读者能打开图片，由获授权的账号上传。[创建存储桶](https://cloud.tencent.com/document/product/436/14106)
2. 在桶的「域名与传输管理 → 自定义源站域名」添加 `img.example.com`，源站类型选「默认源站」。如果这个子域名已经在供图，先按原对象键迁好旧图，旧文章就能沿用原地址。在腾讯云 DNSPod 添加或更新 CNAME 记录，主机记录填 `img`，记录值填控制台给出的桶域名，例如 `fold-journal-media-1250000000.cos.ap-guangzhou.myqcloud.com`。回到 COS 绑定覆盖 `img.example.com` 的 HTTPS 证书。[配置自定义源站域名与证书](https://cloud.tencent.com/document/product/436/36638)
3. 打开桶的「文件列表」，建好 `media/posts/learn-of-stylessp/` 目录，上传仓库里《StyleSSP》的 `x1.webp`，存储类型选「标准存储」，权限继承存储桶。这样，对象键就是 `media/posts/learn-of-stylessp/x1.webp`。[仓库中的原图](../public/media/posts/learn-of-stylessp/x1.webp) · [控制台上传文件](https://cloud.tencent.com/document/product/436/14113)

等解析和证书生效，在浏览器无痕窗口打开下面的地址，应当能直接看到帆船。用 PowerShell 查看响应头，状态码应为 `200`，`Content-Type` 应为 `image/webp`。

```powershell
curl.exe -I "https://img.example.com/media/posts/learn-of-stylessp/x1.webp"
```

## 把已有图片复制到 COS

日常发一两张图可以直接用控制台。批量搬图时，在本机运行 `rclone config`，新建名为 `cos` 的远端，类型选 `s3`，提供商选 `TencentCOS`。用腾讯云访问管理（CAM）给上传用的子账号授予列举该桶、读取和上传对象的权限，将它的 `SecretId` 和 `SecretKey` 填入本机的 rclone 配置。[腾讯云授权说明](https://cloud.tencent.com/document/product/436/38618) · [rclone 的腾讯云配置](https://rclone.org/s3/#tencent-cos)

`endpoint` 填桶所在地域的服务地址，广州为 `cos.ap-guangzhou.myqcloud.com`。`acl` 选 `default`，对象继承桶权限。在高级设置中将 `force_path_style` 设为 `false`，让 rclone 用带桶名的域名访问新桶。桶已在控制台建好，`no_check_bucket` 可设为 `true`。[COS 域名规则](https://cloud.tencent.com/document/faq/436/102489) · [rclone S3 参数](https://rclone.org/s3/)

在项目根目录先用 `--dry-run -v` 预览清单，核对目标桶和 `media/` 前缀。第二条命令复制新增或有变化的图片，第三条按本地清单逐项核对远端副本。[复制目录](https://rclone.org/commands/rclone_copy/) · [核对副本](https://rclone.org/commands/rclone_check/)

```powershell
rclone copy ./public/media cos:fold-journal-media-1250000000/media --dry-run -v
rclone copy ./public/media cos:fold-journal-media-1250000000/media --progress
rclone check ./public/media cos:fold-journal-media-1250000000/media --one-way
```

## 在文章和影集里引用

核对通过后，把文章正文的图片路径、文章封面的 `cover.src` 和友链的 `avatar` 换成完整 HTTPS 地址。保留文件名的大小写，例如 `media/friends/Azsgw.webp`。文章里的帆船图可以这样写。[文章原稿](../src/content/posts/learn-of-stylessp.md) · [友链数据](../src/data/friends.json)

```markdown
![StyleSSP 与旧方法把同一张帆船照片转成几何插画的效果对比](https://img.example.com/media/posts/learn-of-stylessp/x1.webp)
```

发第一本影集时，可以新建 `src/content/albums/river.md`。把照片上传到桶里的 `albums/river/`，再按观看顺序填写 `photos`。首张照片默认作封面，另选封面时填写 `cover.src` 和 `cover.alt`。

```yaml
---
title: 河岸
description: 傍晚沿河拍下的一组照片。
date: 2026-11-23
tags: [摄影]
photos:
  - src: https://img.example.com/albums/river/01.webp
    alt: 傍晚从桥上望向河岸
  - src: https://img.example.com/albums/river/02.webp
    alt: 对岸树影映在浅水里
---
```

依次运行 `npm run build` 和 `npm run preview`。在《StyleSSP》正文、友链页和新影集里查看插图、头像和封面，确认浏览器从图片子域名取图后再发布。

## 费用

按上面的方式直接从 COS 读图，费用主要来自图片占用的存储容量、读写请求次数，以及读者下载图片产生的外网下行流量。估算流量时，可以用一张图的大小乘以实际下载次数，再按桶所在地域查价。[COS 计费说明](https://cloud.tencent.com/document/product/436/36522) · [流量费用](https://cloud.tencent.com/document/product/436/53863)
