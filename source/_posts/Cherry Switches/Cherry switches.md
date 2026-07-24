---
title: Cherry 轴体与键盘开关资料总览
date: 2026-07-22
updated: 2026-07-24
top: true
description: 从早期 S31、M7、M8、M9 到当前 MX、MX2A、MX-LP 与 MX-ULP，系统整理 Cherry 键盘开关的历史、结构、手感和官方技术参数。
summary: Cherry 键盘开关历史、结构、手感与参数总览
img: /medias/switches/cherry-m71-0100.jpg
tags:
  - Cherry 轴体
  - 键盘开关
  - MX
categories:
  - Cherry 资料
---

Cherry 的键盘开关历史远不止今天常见的红轴、茶轴、青轴和黑轴。在 MX 诞生以前，Cherry 已经尝试过微动结构、簧片触点、金合金交叉点、静电容和薄膜触点；MX 之后又发展出 ML、MY、MV、Low Profile 与 Ultra Low Profile 等不同方向。

本文以 [Telcontar 的 Cherry Switches 档案](https://telcontar.net/KBK/Cherry/#switches) 为历史主线，并结合其收录的 Cherry 原厂图纸、目录、专利和数据表进行中文整理；在仍然生产的 MX 系列部分，补充 [CHERRY 中国官网 MX 页面](https://www.cherry.cn/mx.html) 及各轴体详情页截至 `2026-07-24` 公布的信息。文中的年份、参数与型号均尽量保留资料边界：有争议的地方会明确标注“推测”“约”或“待考”，不会把收藏圈经验当成原厂结论。

> **图片与资料使用说明：**本文是非官方中文整理。历史图片仅选用 Telcontar 声明为公共领域的站内作品，或页面明确标为 CC0 的照片；当前产品图片直接引用 CHERRY 中国官网 CDN，并在图注中单独标明。CHERRY 官网图片及其中的文字、商标版权归 CHERRY 或相应权利人所有，仅用于轴体识别与资料说明，不属于本站开源许可范围。原始数据仍请以对应年代的 Cherry 图纸、目录和数据表为准。

![Cherry MX 开关类型选集](/medias/switches/cherry-mx-selection.jpg)

*图：Cherry MX 开关类型选集。来源：Telcontar / Daniel Beardsmore，Public Domain。*

## 先读懂参数

| 参数 | 中文含义 | 阅读方法 |
| --- | --- | --- |
| Pretravel | 预行程 / 触发行程 | 从开始按压到电气导通的距离 |
| Total travel | 总行程 | 从初始位置到底部的完整位移 |
| Initial / preload force | 初始力 / 预压力 | 刚开始推动轴心所需的力 |
| Operating / actuation force | 动作力 / 触发力 | 到达触发点时的力 |
| Tactile force | 段落峰值力 | 越过段落点附近的峰值，不等同于触发力 |
| Terminal / end force | 触底力 | 接近或到达总行程末端时的力 |
| Bounce time | 触点回弹时间 | 触点闭合后稳定所需时间，越短越利于高频输入 |
| Momentary | 瞬时动作 | 松手后自动复位，是普通键盘最常见的形式 |
| Alternate action | 交替动作 / 自锁 | 每次按压在锁定与释放之间切换 |
| SPST-NO | 单刀单掷常开 | 未按下时断开，按下后接通 |

本文沿用资料中的 cN、gf、mm、V 和 mA。`1 gf = 0.980665 cN`，收藏资料中常近似看作同一量级，但两者并不完全相等。

## 系列速览

| 系列 | 大致年代 | 结构 / 信号方式 | 总行程 | 主要特点 |
| --- | --- | --- | --- | --- |
| S31 | 1968 年或更早 | 开放式微动、金合金交叉点 | 待考 | 从工业微动向低能量键盘开关过渡 |
| Reed | 1970 年前后 | 簧片管 + 磁体 | 最大 4.8 mm | 磁力制造段落感，寿命至少 1000 万次 |
| M4/M5/M6 | 1970 年代 | 金合金交叉点 | 最大 4.8 mm | 美国 / 日本体系，含照明和多触点版本 |
| M7 | 1970 年代中期 | 金合金交叉点 | 最大 4.8 mm | 德国体系，与 M4/M5/M6 并非简单改名关系 |
| MF / 静电容 | 1970 年代后期至 1980 年代 | 泡棉垫片静电容 | 公开参数不足 | 无机械触点，已知型号带回差 |
| M8 / MD / MJ | 约 1979 年后 | 金属棱柱或镀金线触点 | 1.5–4 mm | 低矮结构，多种行程、触点和键帽安装规格 |
| M9 | 1979 年后 | 金属触点 | 4.2 mm | 面向 Triumph-Adler 电子打字机，可双段动作 |
| MX / MX2A | 1983 年末起 | Gold Crosspoint | 通常 3.4–4 mm | 最长寿、影响最大的 Cherry 独立机械轴系列；MX2A 为当前改良结构 |
| ML | 年代待进一步核对 | 低矮 Gold Crosspoint | 3.0 mm | 面向紧凑型键盘，单独 PCB 安装 |
| MY / FTSC | 1980 年代中后期 | 独立机械模块 + 薄膜触点 | 型号资料不完整 | 常见于 G81，轴模块负责回弹与压合薄膜 |
| M11 | 1979 年图纸可证 | HP 定制金属触点 | 3.175 mm | 用于替代 Datanetics DC-60 的特殊系列 |
| M85 | 1987 年 | Hirose 中央照明触点 | 待考 | M8 衍生的中央照明型号 |
| MX-LP / MX Low Profile | 2018 年 | 低矮 Gold Crosspoint | 3.2 mm | 独立板装低矮轴，Red 与 Speed Silver 两类 |
| MV / Viola | 2020 年 | 开放式桥接触点 | 4.0 mm | 面向主流价位的半独立结构 |
| MX-ULP / MX Ultra Low Profile | 2021 年 | 开放式 SMD 结构 | 1.8 mm | 整体高度 3.5 mm，面向笔记本及超薄设备 |

## S31：从微动开关走向键盘

S31 是 Cherry 早期的低能量微型开放式快动开关。收藏圈有时把它称作“mousetrap”，因为内部弹片动作很像捕鼠夹。它可以理解为 S30 思路向金合金交叉点触点的适配，资料可追溯到 1968 年或更早。

目前仍缺少带 Cherry 标识且来源完整的实物样本，因此 S31 是否被大规模作为独立键盘轴使用，证据并不充分。能够确认的是，相关低能量型号的额定电流约为 `0.1 A`，HP 9100A 计算器键盘曾使用 68 只同类开关。对 S31 最稳妥的定位，是 Cherry 早期键盘开关技术链条中的重要前身，而不是一个已经完全考证清楚的量产轴系。

## Reed：磁体驱动的簧片开关

Cherry Reed 的专利于 1970 年 7 月提交，并在 1972 年 2 月获批。按键下压时，磁体与簧片管的相对位置发生变化；磁力分离机制同时带来触觉段落。它的结构很高，PCB 到定位板顶部约 `28.4 mm`，外壳还会高出定位板约 `1.5 mm`。

| 项目 | 参数 |
| --- | --- |
| 已知型号 | `201-0100`：SPST-NO；`202-0100`：DPST-NO |
| 动作力 | `2.5 ± 0.5 oz`，约 `69 ± 14 cN` |
| 预行程 | `2.4 ± 0.8 mm` |
| 总行程 | 最大 `4.8 mm` |
| 额定功率 | DC `7 W`；AC `12 VA` |
| 最大电流 / 电压 | `0.25 A` / `28 V` |
| 回弹时间 | 不超过 `1 ms` |
| 初始电阻 | 不超过 `250 mΩ` |
| 寿命 | 至少 `1000 万次` |

公开资料中只确认过套件键盘使用这种开关，它的销售周期似乎不长。Reed 更像 Cherry 对高可靠、低磨损输入方案的一次早期探索。

## M4/M5/M6 与 M7：早期金合金交叉点家族

M4、M5、M6 主要属于美国 / 日本制造体系，外壳通常更光亮；M7 则属于德国体系，表面更偏哑光和纹理质感。两边在外形和命名上相近，但不是简单的同系列改名。M4 偏向角部照明，M5/M6 提供不同结构；M7 又分中央照明、标准、多触点及侧面照明等形式。

![Cherry M61-0120 Style A](/medias/switches/cherry-m61-0120.jpg)

*图：推定为 M61-0120 Style A。摄影：Jeremy Martin，CC0；来源：Telcontar。*

早期 `261/262` 后来改编号为 `M61/M62`。常见基础型号包括 `M61-0100`（SPST-NO）、`M62-0100`（DPST-NO）以及 `M61-0800` 交替动作版本。M7 中可见 M71 中央照明、M73/M74 标准版本，以及 M75–M78 多触点或侧照版本。

| 项目 | M4/M5/M6 资料参数 |
| --- | --- |
| 动作力 | `2.5 ± 0.5 oz`，约 `69 ± 14 cN` |
| 预行程 | `2.4 ± 0.8 mm` |
| 总行程 | 最大 `4.8 mm` |
| 额定功率 | DC / AC `3 W / 3 VA` |
| 最大开关电流 | `0.125 A` |
| 最大持续电流 | `0.5 A` |
| 最大电压 | `28 V` |
| 回弹时间 | 不超过 `2 ms` |
| 初始触点电阻 | 最大 `200 mΩ`，典型 `25 mΩ` |
| 标称寿命 | 至少 `1000 万次`；部分广告曾宣称 `5000 万至 1 亿次` |

![Cherry M71-0100](/medias/switches/cherry-m71-0100.jpg)

*图：推定为 M71-0100。摄影：Jeremy Martin，CC0；来源：Telcontar。*

M7 的精确首发年份仍不明朗，现有图纸把线索指向 1974 年前后。不同颜色轴心是否对应固定手感或重量，也没有足够原厂材料支持统一结论。Hirose 后续在日本生产 M5、M6，时间线大致为 1983 年和 1985 年。

## Solid State / MF：泡棉垫片静电容

Cherry 的固态静电容键盘使用泡棉垫片改变电容，不依赖传统金属触点；已知版本均带有回差。1977 年已有相关宣传，1979 年可见 `CB80-07AA`、`CB80-12AA`，到 1982 年 CB80 编码改为 B4V / B4VE。后来的 Series MF 看起来是面向 DIN 人机工学要求的泡棉垫片方案。

这部分史料仍不完整：专利图与现存实物并非完全一致，公开页面也没有给出可统一引用的力程、电气和寿命参数。日本 Hirose 版本还出现过触觉弹片或橡胶套结构。因此，这一系列更适合按“技术路线”理解，不能把某个样本的参数推广到全部 MF / 静电容键盘。

## M8、MD、MJ：2.5 mm 到 4 mm 的低矮路线

德国 M8 提供 `2.5 mm` 总行程，标准版本采用 6 mm 键帽安装柱，也有 12 mm 版本。按触点材料可分为 M81、M82、M84：M81 使用金合金实体棱柱，M82 使用银合金实体棱柱，M84 则改用成本更低的镀金线触点。

它可配置单刀或双刀、线性或两档段落、LED、0° / 7° 轴心、空格加重、开放或封闭上盖，以及 6 mm / 12 mm 键帽柱。Cherry 于 2013 年 7 月 31 日发布停产通知，最后购买日为同年 10 月 31 日。

| 项目 | M8 参数 |
| --- | --- |
| 总行程 | `2.5 +0.2/-0.3 mm` |
| 线性预行程 | `1.6 ± 0.6 mm` |
| 普通段落预行程 | `1.3 ± 0.6 mm` |
| 德国邮政段落预行程 | `1.4 ± 0.6 mm` |
| 回弹时间 | 1982 目录为最大 `2 ms`；其他手册为最大 `5 ms` |
| 瞬时版本寿命 | `1000 万次` |
| 最大持续电流 | `500 mA` |
| 初始触点电阻 | 最大 `200 mΩ`，典型 `25 mΩ` |

| 子系列 | 触点 | 最大开关电流 | 最大电压 |
| --- | --- | --- | --- |
| M81 | AuAg26Ni3 金合金实体棱柱 | `100 mA` | `28 V` |
| M82 | AgPd30 银合金实体棱柱 | `100 mA` | `60 V` |
| M84 | AuAg10、3 µm 镀金线 | `10 mA` | `12 V` |

Hirose 的 M83A 保持 `2.5 mm` 行程，M83S 缩短到 `1.5 mm`；1983 年 4 月推出的 MD、MJ 分别扩展到 `3 mm` 和 `4 mm`。四者外壳高度依次约为 `6.7 / 6.7 / 7.3 / 7.7 mm`。Hirose 原始数据表不允许公开展示，因此这里只记录公开页面可核对的数据，不附原表扫描件。

## M9：为电子打字机而生

M9 由 Günter Murmann 设计，1979 年申请专利，主要面向 Triumph-Adler 电子打字机。它支持单刀 / 双刀、瞬时 / 自锁 / 双段动作、LED、0° / 7° / 10° 轴心、空格加重、6 mm / 12 mm 键帽，以及 PCB 或定位板安装。

| 项目 | 参数 |
| --- | --- |
| 总行程 | `4.2 mm` |
| 预行程 | `2.0 ± 0.6 mm` |
| 第二段动作点 | `3.5 ± 0.5 mm` |
| 回弹时间 | 最大 `2 ms` |
| 瞬时版本寿命 | `1600 万次` |
| 自锁版本寿命 | `500 万次` |
| 最大持续电流 | `500 mA` |
| 初始触点电阻 | 最大 `200 mΩ`，典型 `25 mΩ` |

M91 到 M94 代表不同触点体系，但 M91 没有发现对应技术文档。M92 / M93 的最大开关电流为 `100 mA`，其中 M93 在 1982 目录中写作 `125 mA`；M94 为 `10 mA`。电压等级随触点类型约为 `60 V / 28 V / 12 V`。由于现存表格列关系并不完全清晰，识别具体实物时应优先看完整料号和年代图纸。

## MX：延续至今的核心家族

Cherry MX 自 1983 年末起持续生产。它为符合当时 DIN 键盘人机工学要求而采用完整约 `4 mm` 行程，早期就包含线性、段落、回差、双触点等设计，量产主流后来转为单刀常开，并可选 LED、二极管或跳线。

![CHERRY MX 系列官方展示图](https://cdn6.zhuocms.com/storage/wwwcherrycn/LBTT/202404/29662f5d7436e19.png)

*图：CHERRY MX 系列官方展示图。来源：[CHERRY 中国官网 MX 页面](https://www.cherry.cn/mx.html)；版权归 CHERRY 或相应权利人所有。*

![Cherry 6 mm 与 8 mm 键帽安装柱对比](/medias/switches/cherry-6mm-8mm-stems.svg)

*图：Cherry 6 mm 与 MX 8 mm 键帽安装柱尺寸对比。制图：Telcontar / Daniel Beardsmore，Public Domain。*

MX 的核心是 Gold Crosspoint 触点：两个交叉的贵金属接触点在动作时形成可靠导通，并具备一定自清洁能力。早期资料常见 `2000 万次`寿命，后来提高到 `5000 万次`；部分 2020 年后的 RGB Red、Black、Brown、Speed 版本达到 `1 亿次`，典型回弹时间缩短到 `1 ms` 以下。不同年代的数据表会有差异，收藏老轴时不能直接套用今天 MX2A 的规格。

### 官网当前 MX 分类

CHERRY 中国官网当前把机械轴体分成 MX、MX 标准轴、MX-LP 矮轴和 MX-ULP 超矮轴四个入口。这里的“MX”和“MX 标准轴”是官网栏目名称，不代表前者不是标准高度；为了避免混淆，下文把前者称作“MX 页面产品”，把后者称作“MX 标准轴页面产品”。

| 官网栏目 | 当前列出的轴体 | 结构重点 |
| --- | --- | --- |
| [MX](https://www.cherry.cn/mx.html) | 银轴、青轴、红轴、黑轴、墨轴、玉轴 | 经典 MX 手感及定制轴体 |
| [MX 标准轴](https://www.cherry.cn/mx_stand.html) | 花瓣轴、茶轴、极光轴，以及 MX2A 黑、红、静音红、墨、青、银、玉轴 | 标准高度，包含 MX2A 改良结构和定制轴 |
| [MX-LP 矮轴](https://www.cherry.cn/mx_lp.html) | 矮红轴、矮银轴 | `3.2 mm` 总行程，面向薄型键盘 |
| [MX-ULP 超矮轴](https://www.cherry.cn/mx_ulp.html) | 超矮轴 | 整体高度约 `3.5 mm`，面向笔记本及超薄设备 |

### MX 页面当前轴体

下表只写官网列表或详情页能够直接核对的参数。墨轴和玉轴属于较新的定制产品，其数值不应仅凭轴心颜色套用经典黑轴、茶轴或其他旧型号。

| 轴体 | 类型 | 触发力 | 段落力 | 预行程 | 总行程 | 官网定位 / 说明 |
| --- | --- | --- | --- | --- | --- | --- |
| [MX 银轴](https://www.cherry.cn/mx-6335.html) | 线性、快速触发 | `45 ± 15 cN` | 无 | `1.2 ± 0.4 mm` | 官网摘要未列出 | 快速触达，面向游戏 |
| [MX 青轴](https://www.cherry.cn/mx-6336.html) | 强段落、有声 | `50 ± 15 cN` | `60 ± 15 cN` | `2.2 ± 0.6 mm` | 官网摘要未列出 | 声音清脆、节奏感强 |
| [MX 红轴](https://www.cherry.cn/mx-6337.html) | 线性 | `45 ± 15 cN` | 无 | `2.0 ± 0.6 mm` | 官网摘要未列出 | 轻巧触及、回弹迅速 |
| [MX 黑轴](https://www.cherry.cn/mx-6338.html) | 重手线性 | `60 ± 20 cN` | 无 | `2.0 ± 0.6 mm` | 官网摘要未列出 | 触发灵敏、回馈迅速 |
| [MX 墨轴](https://www.cherry.cn/mx-6348.html) | 线性 | `63.5 cN` | 无 | `2.0 mm` | `4.0 mm` | 基于社区所称 NIXIE 风格回归；黑色轴心、乳白上盖、黑色底壳、镀金弹簧 |
| [MX 玉轴](https://www.cherry.cn/mx-6349.html) | 中段落 | `40 cN` | `55 cN` | `2.0 mm` | `4.0 mm` | 官网称其为 CHERRY 首款定制轴；标称寿命超过 `5000 万次` |

### 经典与特殊 MX 对照

下表按 Telcontar 汇总的历史数据整理。触底力来自相应年代曲线或数据表时才列出，空白不代表没有触底力，而是缺少适合统一比较的数据。

| 类型 | 料号族 | 手感 | 预行程 | 总行程 | 动作 / 段落力 | 约触底力 | 备注 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Black 黑轴 | `MX1A-11xx` | 线性 | 约 `2 mm` | 约 `4 mm` | `60 ± 20 cN` | 约 `85 cN` | 早期核心线性型号 |
| Linear Grey 线性灰 | `MX1A-21xx` | 线性、空格加重 | 约 `2 mm` | 约 `4 mm` | `80 ± 25 cN` | 约 `110 cN` | 常用于大键 |
| Lock 锁轴 | `MX1A-31xx` | 线性、自锁 | 约 `2 mm` | 约 `4 mm` | `60 ± 20 cN` | 约 `105 cN` | 交替动作，不是普通瞬时轴 |
| White 白轴 | `MX1A-A1xx` | 段落 + 回差 / 轻微声响 | 约 `2 mm` | 约 `4 mm` | `70 ± 20 cN` | 约 `85 cN` | 原始段落型 MX 路线 |
| Click Grey 点击灰 | `MX1A-B1xx` | 段落有声、空格加重 | 约 `2 mm` | 约 `4 mm` | 约 `95 cN` | — | 对应重手大键用途 |
| Clear 透明轴 | `MX1A-C1xx` | 段落无声 | 约 `2 mm` | 约 `4 mm` | `55 ± 20 cN` | 约 `95 cN` | 段落比茶轴更明显 |
| Tactile Grey 段落灰 | `MX1A-D1xx` | 段落无声、空格加重 | 约 `2 mm` | 约 `4 mm` | 历史参数不完整 | — | Clear 的大键对应型号 |
| Blue 青轴 | `MX1A-E1xx` | 段落有声 + 回差 | 约 `2 mm` | 约 `4 mm` | `50 ± 15 cN` | 约 `60 cN` | Cherry 资料称 1987 年推出 |
| Green 绿轴 | `MX1A-F1xx` | 段落有声、空格加重 | 约 `2 mm` | 约 `4 mm` | `70 ± 20 cN` | 约 `90 cN` | 青轴的重手对应型号 |
| Brown 茶轴 | `MX1A-G1xx` | 段落无声 | 约 `2 mm` | 约 `4 mm` | `45 ± 20 cN` | 约 `60 cN` | 1992 年为 Kinesis 定制 |
| Red 红轴 | `MX1A-L1xx` | 线性 | 约 `2 mm` | 约 `4 mm` | `45 ± 15 cN` | 约 `58 cN` | 2008 年出现，后成为常规型号 |
| Silent Red 静音红 | `MX3A-L1xx` | 阻尼线性 | `1.9 ± 0.6 mm` | `3.7 -0.4 mm` | `45 ± 15 cN` | — | 上下行均有缓冲结构 |
| Silent Black 静音黑 | `MX3A-11xx` | 阻尼线性 | `1.9 ± 0.6 mm` | `3.7 -0.4 mm` | `60 ± 20 cN` | — | 重手静音线性 |
| Nature White 自然白 | `MX1A-41NA` | 线性 | 约 `2 mm` | 约 `4 mm` | `52 ± 15 cN` | — | 2019 年停产通知所涉型号 |
| Speed Silver 银轴 | `MX1A-51xx` | 短触发线性 | `1.2 ± 0.4 mm` | `3.4 -0.4 mm` | `45 ± 15 cN` | — | 面向快速触发 |
| Ergo Clear | `MX1A-H1xx` | 段落无声 | `2 mm` | `4 mm` | 触发约 `40 cN`，段落约 `55 cN` | — | 2022 年成为正式产品 |
| Black Clear-Top | `MX1A/MX2A-61NW` | 线性 | `2 mm` | `4 mm` | `63.5 cN` | `110 cN` | 官方复刻社区所称 Nixie 风格 |

RGB 版本主要改为透明上盖以配合 PCB 上的 SMD RGB LED，基础力程通常对应同色标准版本。所谓“Vintage MX”更多是收藏者对特定年代实物手感的概括；关于某年是否统一更换塑料材料，公开证据仍不足，不宜写成确定的生产分界线。

### MX2A：当前标准轴改良结构

MX2A 延续 Gold Crosspoint 电气触点和 MX 十字轴心兼容体系，但对影响顺滑度、声音和一致性的机械部件进行了改良。官网详情图给出的共同结构包括：

- 轴心桶柱四周环状点润，使润滑位置与机械配合集中在导向区域，并降低弹簧噪声。
- 弹簧由桶形过渡到圆柱形设计，以减小公差并改善回弹一致性。
- 轴心使用六条肋骨加强结构，轴心与导轨表面采用钻石抛光处理，以降低滑动刮擦。
- Gold Crosspoint 触点采用两点焊接；官网详情图称触点表面为 `99.99%` 黄金涂层。
- MX2A 红、黑、银、静音红、茶、玉和墨轴的详情页写有出厂润滑；MX2A 青轴页面未标注出厂润滑，不应自动视为相同处理。

![CHERRY MX2A 轴体官方参数表](https://cdn6.zhuocms.com/storage/wwwcherrycn/switch/202405/11663f1337ca393.jpg)

*图：CHERRY MX2A 当前零售轴体参数表。来源：[CHERRY 中国官网 MX 标准轴页面](https://www.cherry.cn/mx_stand.html)及详情图；版权归 CHERRY 或相应权利人所有。*

| MX2A 轴体 | 类型 | 触发力 | 段落力 | 预行程 | 总行程 | 标称寿命 | 针脚 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| [黑轴 RGB](https://www.cherry.cn/mx_stand-6341.html) | 重手线性 | `60 ± 20 cN` | 无 | `2.0 ± 0.6 mm` | `4.0 -0.4 mm` | 超过 `1 亿次` | 3 Pin |
| [银轴 RGB](https://www.cherry.cn/mx_stand-6346.html) | 快速触发线性 | `45 ± 15 cN` | 无 | `1.2 ± 0.4 mm` | `3.4 -0.4 mm` | 超过 `1 亿次` | 3 Pin |
| [静音红轴 RGB](https://www.cherry.cn/mx_stand-6343.html) | 轻音线性 | `45 ± 15 cN` | 无 | `1.9 ± 0.6 mm` | `3.7 -0.4 mm` | 超过 `5000 万次` | 3 Pin |
| [青轴 RGB](https://www.cherry.cn/mx_stand-6345.html) | 强段落、有声 | `50 ± 15 cN` | `60 ± 15 cN` | `2.2 ± 0.6 mm` | `4.0 -0.5 mm` | 超过 `5000 万次` | 3 Pin |
| [茶轴 RGB](https://www.cherry.cn/mx_stand-6339.html) | 轻微段落、无声 | `45 ± 20 cN` | `55 ± 20 cN` | `2.0 ± 0.6 mm` | `4.0 -0.4 mm` | 超过 `1 亿次` | 3 Pin |
| [玉轴 RGB](https://www.cherry.cn/mx_stand-6347.html) | 中段落 | `40 cN` | `55 cN` | `2.0 mm` | `4.0 mm` | 超过 `5000 万次` | 3 Pin |
| [红轴 RGB](https://www.cherry.cn/mx_stand-6342.html) | 轻手线性 | `45 ± 15 cN` | 无 | `2.0 ± 0.6 mm` | `4.0 -0.4 mm` | 超过 `1 亿次` | 3 Pin |
| [墨轴（无光）](https://www.cherry.cn/mx_stand-6344.html) | 重手线性 | `63.5 cN` | 无 | `2.0 mm` | `4.0 mm` | 超过 `5000 万次` | 5 Pin |

### 花瓣轴与极光轴

花瓣轴和极光轴也是官网“MX 标准轴”栏目中的当前产品，但并非只靠颜色区分的经典 MX 复刻。两者均提供了较完整的结构说明。

| 项目 | [花瓣轴](https://www.cherry.cn/mx_stand-6420.html) | [极光轴](https://www.cherry.cn/mx_stand-6407.html) |
| --- | --- | --- |
| 类型 | 微段落、无声 | 线性、静音 |
| 触发力 | `30 cN`，官网称初始压力与触发压力相同 | `45 cN` |
| 预行程 | `2.0 mm` | `1.6 ± 0.4 mm` |
| 总行程 | `4.0 mm` | `3.7 ± 0.4 mm` |
| 回弹时间 | 官网未列出 | 小于 `1 ms` |
| 标称寿命 | 超过 `5000 万次` | 超过 `5000 万次` |
| 安装 | 5 Pin | 5 Pin、双点焊接 |
| 轴心 / 外壳 | 标准 MX 十字轴心；粉色系外壳 | POM 轴心、尼龙半透明上盖、尼龙底壳 |
| 弹簧 | `16 mm` 加长弹簧 | `18 mm` 镀金弹簧 |
| 润滑 / 降噪 | 出厂精密润滑；以较轻微的段落确认按压 | 出厂精密润滑；轴心两侧嵌入定制消音硅胶条，降低摩擦与触底碰撞声 |
| 触点 | Gold Crosspoint | Gold Crosspoint；官网称触点表面为 `99.99%` 黄金涂层 |

![CHERRY 花瓣轴官方产品图](https://cdn6.zhuocms.com/storage/wwwcherrycn/switch/202510/1768f202547972b.png)

*图：CHERRY 花瓣轴。来源：[CHERRY 中国官网花瓣轴详情页](https://www.cherry.cn/mx_stand-6420.html)；版权归 CHERRY 或相应权利人所有。*

![CHERRY 极光轴官方产品图](https://cdn6.zhuocms.com/storage/wwwcherrycn/switch/202510/1768f1ef243802f.png)

*图：CHERRY 极光轴。来源：[CHERRY 中国官网极光轴详情页](https://www.cherry.cn/mx_stand-6407.html)；版权归 CHERRY 或相应权利人所有。*

## ML：低矮 Gold Crosspoint

Telcontar 的 Cherry 总览页注明 ML 主页面“本站未收录”，但其料号页与 Cherry ML1A 原厂数据表仍提供了可核对参数。ML 是独立 PCB 安装的低矮机械开关，采用单刀常开 Gold Crosspoint 触点，常见于 G84 系列紧凑键盘。

| 项目 | ML1A 参数 |
| --- | --- |
| 手感 | 段落；段落峰值 `50 ± 20 cN` |
| 总行程 | `3.0 -0.5 mm` |
| 预行程 | `1.5 ± 0.5 mm` |
| 初始力 | 最小 `30 cN` |
| 触发力 | `45 ± 20 cN` |
| 最大电压 / 电流 | `12 V AC/DC` / `10 mA AC/DC` |
| 触点结构 | SPST-NO，AuAg10 Gold Crosspoint |
| 回弹时间 | 最大 `5 ms` |
| 初始触点电阻 | 小于 `200 mΩ`，典型 `25 mΩ` |
| 寿命 | 超过 `2000 万次` |
| 工作温度 | `-10°C 至 +70°C` |
| 防护等级 | `IP40` |

ML1A 是较矮的常见版本，资料中还出现过更高、更坚固的 ML1B。两者的精确投产与停产时间尚待更多目录交叉验证。

## MY / FTSC：机械模块压合薄膜

MY 是德国 FTSC（Full-Travel Sealed Contact）产品线，绝大多数配套键盘归入 G81。它不是 MX 式独立金属触点轴：每个按键有独立回弹弹簧和执行弹片，最终由模块压合下方薄膜触点，因此常被描述为“带独立机械按键模块的薄膜键盘”。

英国 Cherry Electrical Products 于 1984 年申请早期设计专利；德国团队为降低打字机键盘成本继续改良，并在 1985–1986 年申请新专利。现有收藏资料把 MY 分为 Type 1a、1b、2、3，但这不是官方命名。Type 1 热铆在背板上，拆除通常会损坏；Type 2、3 改为可拆结构。各类型缺少统一、可信的原厂力程测量，因此本文不编造具体克数。识别时应记录轴心颜色、安装方式、背板结构和完整键盘料号。

## M11、M85 与 Cherry 代工 Hi-Tek

![Cherry M11 开关](/medias/switches/cherry-m11.jpg)

*图：两只标准 M11（非空格版本）。来源：Telcontar / Daniel Beardsmore，Public Domain。*

M11 是为 HP 键盘准备的特殊单刀开关，意在作为 Datanetics DC-60 的兼容替代品。已知图纸日期为 1979 年 11 月，普通版本多为黑色；透明 `M11-0101` 是空格加重版本，动作力约 `95 ± 25 cN`。总行程为 `3.175 mm`。目前只在 HP 相关键盘中确认过使用。

M85 则是 Hirose Cherry 在 1987 年 4 月推出的 M8 衍生中央照明轴，已知型号为 `M85A-0N00`，单刀结构，并在 2013 年与后期 M8 产品一同走向停产。

此外，Cherry 曾按 DEC 要求生产过采用 Hi-Tek High Profile 开关的完整键盘，已知型号 `UB80-01AA`，年代约为 1978–1980 年。这里的开关设计属于 Hi-Tek，Cherry 是键盘制造方，不应把它误归为 Cherry 自研轴体。

## MX-LP 矮轴：3.2 mm 总行程

MX Low Profile 于 2018 年 1 月 12 日发布。它沿用 Gold Crosspoint 触点，但并不是把普通 MX 简单压矮，而是一套独立低矮结构。官网称其整体高度比标准 MX 低约 `35%`，可配合直接安装在 PCB 上的 SMD RGB 或单色 LED；高精度聚合物上盖负责导向，触点具备自清洁能力，并强调防尘污设计。

当前 [CHERRY 中国官网 MX-LP 页面](https://www.cherry.cn/mx_lp.html) 列出矮红轴和矮银轴两款线性轴体。两者动作力和总行程相同，主要差异是矮银轴把触发点进一步提前到 `1.0 mm`。

| 项目 | [MX-LP 矮红轴](https://www.cherry.cn/mx_lp-6363.html) | [MX-LP 矮银轴](https://www.cherry.cn/mx_lp-6364.html) |
| --- | --- | --- |
| 手感 | 线性 | 线性、快速触发 |
| 动作力 | `45 cN` | `45 cN` |
| 预行程 | `1.2 mm` | `1.0 mm` |
| 总行程 | `3.2 mm` | `3.2 mm` |
| 当前官网标称寿命 | 超过 `1 亿次` | 超过 `1 亿次` |
| 照明 | 支持 PCB 上的 SMD RGB 或单色 LED | 支持 PCB 上的 SMD RGB 或单色 LED |
| 制造信息 | 官网详情图标注德国设计与制造 | 官网详情图标注德国设计与制造 |

![CHERRY MX-LP 矮红轴官方产品图](https://cdn6.zhuocms.com/storage/wwwcherrycn/switch/202405/306657de67adf9a.jpg)

*图：CHERRY MX-LP 矮红轴。来源：[CHERRY 中国官网矮红轴详情页](https://www.cherry.cn/mx_lp-6363.html)；版权归 CHERRY 或相应权利人所有。*

![CHERRY MX-LP 矮银轴官方产品图](https://cdn6.zhuocms.com/storage/wwwcherrycn/switch/202405/306657e0408d79f.jpg)

*图：CHERRY MX-LP 矮银轴。来源：[CHERRY 中国官网矮银轴详情页](https://www.cherry.cn/mx_lp-6364.html)；版权归 CHERRY 或相应权利人所有。*

### 2018 年早期数据表参数

早期资料记录的料号为红色轴心 `MX1B-L2NA` 和银色 Speed `MX1B-52NA`。早期数据表与当前官网在核心力程上相符，但寿命标注从当年的 `5000 万次`提高到当前详情图的“超过 `1 亿次`”；这更可能反映产品迭代或测试规格更新，不能把新寿命倒推给所有早期实物。

| 项目 | Red | Speed Silver |
| --- | --- | --- |
| 手感 | 线性 | 线性 |
| 总行程 | `3.2 ± 0.25 mm` | `3.2 ± 0.25 mm` |
| 预行程 | `1.2 ± 0.3 mm` | `1.0 ± 0.3 mm` |
| 最小预压力 | `30 cN` | `30 cN` |
| 动作力 | `45 ± 15 cN` | `45 ± 15 cN` |
| 典型回弹 | `1 ms` | `1 ms` |
| 标称寿命 | `5000 万次` | `5000 万次` |
| 最大电压 | `12 V AC/DC` | `12 V AC/DC` |
| 最小轴间距 | `16 mm` | `16 mm` |

## MV / Viola：开放式主流方案

MV 最初以 Viola 名称于 2020 年 1 月发布。它采用开放底部、定位板安装的半独立结构，PCB 焊盘是固定触点，活动铜合金桥片负责导通；RGB LED 位于 PCB。Cherry 将其渐进式力程称为 `CrossLinear`。

![Cherry MV / Viola 力程曲线](/medias/switches/cherry-mv-force-curve.svg)

*图：依据 Cherry 公布参数绘制的 MV / Viola 力程曲线。制图：Telcontar / Daniel Beardsmore，Public Domain。*

| 项目 | 参数 |
| --- | --- |
| 手感 | CrossLinear，整体接近线性 |
| 总行程 | `4.0 ± 0.4 mm` |
| 预行程 | `2.0 ± 0.6 mm` |
| 最小初始力 | `20 cN` |
| 动作力 | `45 ± 15 cN` |
| 触底附近力 | 约 `75 cN` |
| 典型电压 / 电流 | `2–5 V` / `0.1–1 mA` |
| 触点形式 | SPST-NO |
| 最小轴间距 | `16 mm` |

## MX-ULP 超矮轴：3.5 mm 整体高度

MX Ultra Low Profile 于 2021 年 3 月 18 日发布，面向笔记本和超薄设备。它不再是传统封闭轴壳，而是整体高度约 `3.5 mm` 的开放式 SMD 结构；两只摆臂在跨接弹簧作用下运动，中部透明执行件承载键帽并允许 SMD RGB 光线通过。官网详情图强调德国设计与制造、Gold Crosspoint、短回弹时间、SMD 自动化装配以及高亮度 RGB 适配。

已知型号包括有声段落 `MX6C-K3NB` 和无声段落 `MX6C-T3NB`。Telcontar 早期资料的总参数表把反馈统一写作“Tactile click”，而产品型号又区分 Click 与 Tactile，因此实际识别应以完整型号及相应原厂数据表为准。

当前中文官网还存在一处需要保留的资料矛盾：[MX-ULP 列表页](https://www.cherry.cn/mx_ulp.html)把“超矮轴”卡片写成“线性轴”，但其[产品详情页](https://www.cherry.cn/mx_ulp-6365.html)和官方详情图展示的是 `MX ULP Click`，明确描述为有触感且有点击声。本文不擅自把两者合并，轴体识别仍以完整料号为准。

![CHERRY MX-ULP 超矮轴官方产品图](https://cdn6.zhuocms.com/storage/wwwcherrycn/switch/202405/306657e102abbba.jpg)

*图：CHERRY MX-ULP 超矮轴。来源：[CHERRY 中国官网超矮轴详情页](https://www.cherry.cn/mx_ulp-6365.html)；版权归 CHERRY 或相应权利人所有。*

![Cherry MX Ultra Low Profile 力程曲线](/medias/switches/cherry-mx-ulp-force-curve.svg)

*图：Cherry MX Ultra Low Profile 官方力程数据重绘。制图：Telcontar / Daniel Beardsmore，Public Domain。*

| 项目 | 参数 |
| --- | --- |
| 总行程 | `1.8 mm` |
| 预行程 | `0.8 mm` |
| 段落峰值力 | `65 cN` |
| 触发力 | `52 cN` |
| 早期资料标称寿命 | `1500 万次` |
| 电压 | `5 V` |

上表保留的是早期数据表参数。当前官网详情图对 `MX ULP Click` 标注“超过 `5000 万次`”按键寿命，不能直接覆盖早期型号的 `1500 万次`数据；收藏与维修时应同时记录料号、生产年代和具体规格书版本。

## 如何识别一只未知 Cherry 轴

1. 先记录键盘完整料号、铭牌、生产日期码和产地，不要只看轴心颜色。
2. 拆下一只非大键键帽，拍摄轴心形状、颜色、上盖纹理、Logo、LED 位置和键帽安装柱。
3. 从 PCB 或背板侧记录焊脚数量、定位方式、二极管 / 跳线、薄膜结构及是否可拆。
4. 测量预行程、总行程和外壳高度；老轴的弹簧、润滑和磨损会让手感偏离目录值。
5. 用完整料号对照对应年代的编号规则。相同颜色在不同系列、工厂和年代中不一定代表相同结构。
6. 对无法证实的结论保留“待考”，并保存原图、来源链接和访问日期，方便后续修订。

## 资料误差与收藏注意事项

- 不同年份目录可能给出不同参数，例如 M8 回弹时间有 `2 ms` 与 `5 ms` 两套记录，M93 最大开关电流也有 `100 mA` 与 `125 mA` 的差异。
- 轴心颜色是识别线索，不是单独定论。M7、早期 MX、Hirose 版本尤其需要结合触点和外壳。
- 标称寿命是在规定电压、电流、速度和环境下测得，不等于几十年后老轴仍能达到原始指标。
- “手感”受键帽重量、定位板、弹簧老化、污染、润滑和键位大小影响，目录参数不能完全替代实物体验。
- 文章展示的开关照片和曲线用于史料辨识，不代表 CHERRY 对本站内容的认可或授权。

## 参考资料

- [CHERRY 中国官网：MX](https://www.cherry.cn/mx.html)
- [CHERRY 中国官网：MX 标准轴](https://www.cherry.cn/mx_stand.html)
- [CHERRY 中国官网：MX-LP 矮轴](https://www.cherry.cn/mx_lp.html)
- [CHERRY 中国官网：MX-ULP 超矮轴](https://www.cherry.cn/mx_ulp.html)
- [Telcontar：Cherry Switches 总览](https://telcontar.net/KBK/Cherry/#switches)
- [Telcontar：S31](https://telcontar.net/KBK/Cherry/S31)
- [Telcontar：Cherry Reed](https://telcontar.net/KBK/Cherry/reed)
- [Telcontar：M4/M5/M6 与 M7](https://telcontar.net/KBK/Cherry/M7)
- [Telcontar：Solid State Capacitive](https://telcontar.net/KBK/Cherry/solid_state)
- [Telcontar：M8、MD、MJ](https://telcontar.net/KBK/Cherry/M8DJ)
- [Telcontar：M9](https://telcontar.net/KBK/Cherry/M9)
- [Telcontar：MX](https://telcontar.net/KBK/Cherry/MX)
- [Telcontar：MX Variants](https://telcontar.net/KBK/Cherry/MX_variants)
- [Telcontar：ML 料号规则](https://telcontar.net/KBK/Cherry/ML_schema)
- [Cherry ML1A 原厂数据表镜像](https://www.farnell.com/datasheets/2301175.pdf)
- [Telcontar：MY](https://telcontar.net/KBK/Cherry/MY)
- [Telcontar：M11](https://telcontar.net/KBK/Cherry/M11)
- [Telcontar：M85](https://telcontar.net/KBK/Cherry/M85)
- [Telcontar：Cherry-produced Hi-Tek](https://telcontar.net/KBK/Cherry/Hi-Tek)
- [Telcontar：MX Low Profile](https://telcontar.net/KBK/Cherry/MX_Low_Profile)
- [Telcontar：MV / Viola](https://telcontar.net/KBK/Cherry/MV)
- [Telcontar：MX Ultra Low Profile](https://telcontar.net/KBK/Cherry/MX_Ultra_Low_Profile)
- [Telcontar：About / 图片授权说明](https://telcontar.net/KBK/about)

最后更新：2026-07-24。当前 MX 产品信息以 CHERRY 中国官网在该日期展示的页面和详情图为准；官网后续可能调整产品名称、参数或在售状态。后续如发现新的原厂目录、图纸或可核对实物，本文会继续修订，并保留不确定信息的说明。
