# 折间的 R2 图床

博客仍可部署在 GitHub Pages 或其他静态托管。给公开图片单独使用一个 R2 Standard 存储桶，通过自己的图片子域名提供 HTTPS 地址。以下用 `fold-journal-media` 和 `img.example.com` 举例，请换成你的桶名和域名。

## 从第一张图开始

1. 登录 Cloudflare，进入 **Storage & databases → R2 → Overview**，按提示开通 R2 订阅。选择 **Create bucket**，填写桶名，存储类别选 **Standard**。这个桶只放打算公开的图片。[开通 R2](https://developers.cloudflare.com/r2/get-started/) · [创建存储桶](https://developers.cloudflare.com/r2/buckets/create-buckets/)
2. 把你持有的域名接入同一 Cloudflare 账户。在桶内打开 **Settings → Custom Domains → Add**，填入图片子域名，核对 DNS 记录，点击 **Connect Domain**，等状态变成 **Active**。博客可以继续使用原来的地址。如果只有旧站的 `155tut.github.io` 地址，需要另外准备自己能管理 DNS 的域名；在此之前可用桶设置里的 **Public Development URL** 临时试图。正式接入走自定义域名，`r2.dev` 有限流。[公开桶与自定义域名](https://developers.cloudflare.com/r2/buckets/public-buckets/)
3. 打开桶的 **Objects**，建立 `albums/river/` 文件夹，点 **Upload** 上传一张 `01.webp`。对象的键为 `albums/river/01.webp`，读者访问的地址就是 `https://img.example.com/albums/river/01.webp`。用浏览器无痕窗口直接打开这张图核对访问权限，检查具体文件的地址，桶根目录没有文件列表。[对象上传](https://developers.cloudflare.com/r2/objects/upload-objects/) · [公开对象访问](https://developers.cloudflare.com/r2/buckets/public-buckets/)
4. 把该地址填进文章或影集，在项目里执行 `npm run build`、`npm run preview`，打开对应页面验证图片和封面。本站只需图片的公开 URL，Markdown 和影集数据都支持 HTTPS。上传凭证保存在你自己的上传工具里。

### 文章与影集写法

文章正文直接引用图片，并填写能说明画面内容的替代文字。

```markdown
![傍晚从桥上望向河岸](https://img.example.com/albums/river/01.webp)
```

在 `src/content/albums/` 的 Markdown 文件里，按观看顺序排列 `photos`。第一张默认就是封面，单独拍摄的封面可另填 `cover.src` 和 `cover.alt`。

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

## 搬旧图与日常上传

先把本地图片按相同的相对路径上传，例如 `public/media/posts/` 下的对象保留 `media/posts/` 前缀。抽查文件的 URL、格式和尺寸，再替换正文、封面或头像字段中的路径。带网址的外链图片应先确认手头有原文件或可使用的副本。改图时换一个文件名，已经发出的旧文章仍能使用原地址。

偶尔发图可以一直用控制台。如果更习惯 PowerShell，装有 Node.js 的电脑也可登录 Wrangler，直接上传单张图片。以下命令假设当前目录有 `01.webp`。对象键、文件名及域名均可替换，`--remote` 指向线上桶。[Wrangler 上传参数](https://developers.cloudflare.com/r2/reference/wrangler-commands/#r2-object-put)

```powershell
npx wrangler login
npx wrangler r2 object put fold-journal-media/albums/river/01.webp --remote --file "./01.webp" --content-type image/webp
curl.exe -I "https://img.example.com/albums/river/01.webp"
```

最后一条应返回成功状态，`Content-Type` 应为 `image/webp`。现有文章和影集用普通图片标签展示。以后若用跨域 `fetch` 读原图，或把照片绘到 Canvas 后取像素，再为博客的实际来源配置 CORS。[CORS](https://developers.cloudflare.com/r2/buckets/cors/)

### 一次上传本次迁入的图片

本次迁入的文章图片和友链头像都在 `public/media/`。可以在 R2 的 **Manage API Tokens** 创建限此桶的 **Object Read & Write** 凭证。本机运行 `rclone config`，新建名为 `r2` 的远端，类型选 S3，提供商选 Cloudflare，填入 Access Key ID、Secret Access Key 和控制台给出的 S3 endpoint。对象级令牌需在远端配置中启用 `no_check_bucket = true`。[R2 凭证](https://developers.cloudflare.com/r2/api/tokens/) · [Cloudflare 的 rclone 配置](https://developers.cloudflare.com/r2/examples/rclone/)

在项目根目录先预览清单。确认目标桶和路径后运行第二条，它会复制新增或变化的文件，并保留目标端的其他对象。第三条核对《StyleSSP》正文实际用到的一张插图。[rclone copy](https://rclone.org/commands/rclone_copy/)

```powershell
rclone copy ./public/media r2:fold-journal-media/media --dry-run
rclone copy ./public/media r2:fold-journal-media/media --progress
curl.exe -I "https://img.example.com/media/posts/learn-of-stylessp/x1.webp"
```

确认图片可读后，将 Markdown 正文中的 `/media/posts/…`、封面字段中的 `media/posts/…` 和 `src/data/friends.json` 里的 `media/friends/…` 改为带图片子域名的完整地址，再构建发布。对照本地文件名的大小写，尤其是头像。

## 费用

截至 2026-11-23，Standard 每月有 10 GB-month 存储、100 万次 A 类操作和 1,000 万次 B 类操作的免费额度；上传计入 A 类，对象读取计入 B 类。超出后分别按存储和操作计费，R2 直接对互联网传输免出口流量费。可在 R2 控制台按月查看用量。[Cloudflare R2 价格](https://developers.cloudflare.com/r2/pricing/)
