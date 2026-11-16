# 纸间档案 GitHub Pages 发布包

`dist/` 保存当前网站。`media-parts/` 保存原始 MOV 的字节分段。GitHub Actions 部署时按顺序拼回原文件并校验 SHA-256，浏览器访问站内的完整视频。音频和图片随网站一起发布。

在你的 GitHub 账号下创建一个空仓库，例如 `paper-archive`。把本目录里的 `dist/`、`media-parts/`、`.github/` 和 `README.md` 提交到 `main` 分支。

打开仓库的 **Settings → Pages**，将 **Source** 设为 **GitHub Actions**。在 **Actions → Deploy Paper Archive** 点 **Run workflow** 并选择 `main`。成功后，**Settings → Pages** 会显示实际访问网址。

此发布包保留了网站现有的联系电话、邮箱以及提供的音视频，开启公开 Pages 后访客可以访问这些内容。
