# 奶蛙拍肚肚 · Belly Laugh Beat

一款奶味十足的四键下落式网页音游：接住奶瓶，奶蛙就会笑到捧腹。

## 直接开玩

双击 `index.html` 即可（推荐使用最新版 Edge / Chrome）。

也可以在本目录启动一个本地服务器：

```powershell
python -m http.server 4173
```

然后打开 <http://127.0.0.1:4173/>。本地服务器不是必需的，但使用外部音频素材时体验更稳。

## 玩法

| 操作 | 说明 |
| --- | --- |
| `D` `F` `J` `K` | 四个键位，对应奶糖、薄荷、布丁、紫薯 |
| 点击 / 触屏 | 直接点下落区域或底部奶蛙键也可以 |
| `Esc` | 暂停 / 继续 |
| `M` | 开关声音 |
| 结算页 `R` | 再笑一次 |

奶瓶落到判定圈里时按键。每一局的谱面落点都会重新随机生成，判定分为 PERFECT / GREAT / GOOD / MISS，有连击、准确率、评级和本地最高分。外侧 `D` / `K` 两键播放完整捧腹笑声，中间 `F` / `J` 两键播放单独的短音效；空拍也会有声音。

难度：

- **小口抿（简单）**：四分音符，2 拍/秒左右，先熟悉节奏。
- **正常吨吨（普通）**：八分音符，密度升级，落点依旧随机。
- **暴风吸入（困难）**：额外加入随机十六分音符彩点，笑到冒汗。

## 当前素材

已经接入用户提供的奶蛙大笑图片、笑声视频和录屏音效：

- `assets/mascot-sticker.webp`：从原图去底并加了奶油色贴纸描边，用于键位、首页、暂停页和结算页；WebP 压缩到约 30 KB。
- `assets/laugh.mp3`：截取第一段完整笑声（约 4 秒），以 1.8 倍速处理为约 2.22 秒，再编码为 96 kbps MP3；用于外侧 D / K。
- `assets/middle-fx.mp3`：从录屏中提取并归一化的短音效（约 1.11 秒），编码为 96 kbps MP3；用于中间 F / J。
- 原视频只用于本地生成游戏音效，游戏运行时不依赖视频文件。

抽换素材时修改 [`assets.js`](assets.js)：

```js
window.BABY_ASSETS = {
  babyImage: "assets/mascot-sticker.webp",
  laughAudio: "assets/laugh.mp3",
  middleAudio: "assets/middle-fx.mp3"
};
```

- 图片建议使用透明底 WebP / PNG，游戏会把它作为贴纸显示在四个键位上。
- 音效支持浏览器能播放的格式（mp3 / wav / ogg / m4a）。使用本地服务器时会解码进 Web Audio，延迟更低；`file://` 下自动退回 `<audio>` 播放。
- 为保持加载速度，图片使用 WebP，音效使用 96 kbps MP3。
- 如未配置素材，会自动启用内置 SVG 奶蛙和 Web Audio 合成的兜底笑声。
- 素材保持可商用/已获授权。

## 文件

- `index.html` — 页面结构
- `styles.css` — 视觉、动画、响应式
- `babies.js` — 内置 SVG 奶蛙兜底与素材挂载
- `audio.js` — 原创合成配乐 / 笑声加载与兜底
- `game.js` — 谱面、下落渲染、判定、计分、结算
- `assets.js` — 素材配置
- `assets/mascot-sticker.webp` — 奶蛙贴纸图标
- `assets/laugh.mp3` — 外侧 D / K 的完整笑声（2.22 秒）
- `assets/middle-fx.mp3` — 中间 F / J 的短音效（1.11 秒）
- `favicon.svg` — 网页图标

## 说明

- 配乐“奶盖气泡梦”由 Web Audio 实时合成，120 BPM，时长 40 秒。
- 游戏不依赖任何外部字体或 CDN，离线可玩。
- 最高分与难度选择保存在浏览器 `localStorage`。
- 图片与音效来自用户提供素材；音效文件名标注来源为「奶龙大笑_爱给网_aigei_com.mp4」。
