# JSONCliff：看见 JSON 往返转换中的静默变化

为 API 开发者准备的本地排错工具：粘贴未经 JavaScript 解析的原始 JSON，检查经过 `JSON.parse` 和 `JSON.stringify` 后发生了什么。

## 30 秒上手

用现代浏览器直接打开 `dist/standalone.html`。不需要服务器、应用账号或联网。默认示例会揭示：

- `9007199254740993` 被舍入为 `9007199254740992`
- 重复的 `status` 属性只保留最后一次
- `1e400` 先变成 JavaScript `Infinity`，序列化时成为 `null`
- `-0` 的负号消失
- `1.2300` 变成 `1.23`，仅为表示方式变化，不属于数值损坏
- 普通的 `0.1` 没有告警；工具没有把所有二进制浮点近似都当作损坏

点击问题卡片，会选中原始 JSON 中对应的位置。可以按实际变化、风险、表示方式过滤。超出安全整数范围但本次没有改变的整数，会标成风险而不是损坏。

## 导出与隐私

可导出诊断 JSON、独立 HTML 报告、可直接运行的 `.mjs` 复现脚本。报告和复现脚本都包含原始输入，请先检查是否有密钥或隐私数据再分享。

应用没有后端、遥测、CDN、外部字体，也不在浏览器存储输入。已加载的页面可离线继续使用；需要离线重新打开时，用独立 HTML 文件。[在线演示](https://jsoncliff.lyczz.chatgpt.site)已公开，应用无需账号。

## CLI 和开发

需要 Node.js 22 或 24。

```sh
npm ci
npm test
npm run dev
node lib/cli.js examples/api-response.json
node lib/cli.js examples/api-response.json --format json > report.json
node lib/cli.js examples/api-response.json --format html > report.html
node lib/cli.js examples/api-response.json --format repro > reproduce.mjs
node reproduce.mjs
```

不传文件名或传 `-` 时读取标准输入。只接受有效 UTF-8；BOM 也会被明确拒绝。退出码：0 表示没有实际数据变化，1 表示检测到变化，2 表示无效输入、超限、参数或 I/O 错误。风险与表示方式变化不会触发退出码 1。

源码已开源，但没有向 npm 发布。源码包自带构建结果、测试、CLI 和可离线安装的 npm tarball。`npm run test:package` 会打包并在临时目录真实安装，验证可执行命令和 ESM 导入。

## 边界

最多 1 MiB、60,000 个 token、20,000 个数组项/对象属性、128 层嵌套；单个数字最多 4,096 个字符。超限先报错，再也不会进入整份输入的原生解析。UI 每页最多展示 100 条问题。

本工具比较源文本与原生输出中的精确十进制值，不是替代 JSON 解析器，不自动把数字转成字符串，也不推测业务规则。重复属性会记录每次出现；已经被覆盖的对象里的数值不重复计入数值变化。详见 [语义说明](docs/semantics.md)、[验证记录](docs/validation.md)。

需要在生产环境保留数值时，可研究 [lossless-json](https://github.com/josdejong/lossless-json) 或 [json-bigint](https://github.com/sidorares/json-bigint)。JSONCliff 的定位是排查和提供证据。

MIT 许可。名称和 npm 包名目前是暂定，注册表可用性检查不等于商标检索。
