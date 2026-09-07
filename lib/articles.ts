export type ReadingSection = {
  title: string;
  summary: string[];
  annotation: string;
  takeaway: string;
};

export type ReadingQuestion = {
  level: '机制' | '推导' | '设计';
  prompt: string;
  hint: string;
  answer: string;
};

export type Article = {
  slug: string;
  no: string;
  stage: string;
  stageNo: string;
  source: 'LMSYS' | 'vLLM';
  date: string;
  title: string;
  shortTitle: string;
  dek: string;
  url: string;
  readTime: string;
  difficulty: '入门' | '进阶' | '高阶';
  tags: string[];
  thesis: string;
  why: string;
  topology: string;
  sections: ReadingSection[];
  questions: ReadingQuestion[];
  related: string[];
};

export const articles: Article[] = [
  {
    slug: 'deepseek-96-h100',
    no: '01', stageNo: '01', stage: '建立坐标系', source: 'LMSYS', date: '2025-05-05',
    title: 'Deploying DeepSeek with PD Disaggregation and Large-Scale Expert Parallelism on 96 H100 GPUs',
    shortTitle: 'DeepSeek：96×H100 上的 PD + Wide-EP',
    dek: '从模型结构出发，把 Attention、Dense FFN、Sparse FFN 和 LM Head 映射到不同并行策略。',
    url: 'https://www.lmsys.org/blog/2025-05-05-large-scale-ep/', readTime: '约 32 分钟', difficulty: '进阶',
    tags: ['PD 分离', 'DP Attention', 'Wide-EP', 'DeepEP', 'EPLB'],
    thesis: '并行策略不应以整模型为单位选择，而应由每类算子的计算强度、状态大小和通信形态分别决定。',
    why: '这是理解现代 MoE Serving 的总入口：文章第一次把 DeepSeek 风格的 DP Attention、跨节点 EP、负载均衡与 P/D 分离放进同一张端到端设计图。',
    topology: '12 nodes · 96×H100 · P/D disaggregation · DP Attention · large-scale EP',
    sections: [
      { title: '为什么纯 TP 不再够用', summary: ['MLA 的 latent KV 无法像普通 MHA 那样随 TP 自然切分，扩大 TP 会复制状态并压缩有效 KV 容量。', 'MoE 每 token 只激活少量专家，权重规模大但实际计算稀疏；继续切专家内部矩阵，容易得到效率不佳的小 GEMM。'], annotation: '这里的关键不是“TP 慢”，而是模型结构改变了 TP 的收益函数：权重切分收益还在，但 KV 复制、collective 次数和 GEMM shape 的代价开始占上风。', takeaway: '先按 Attention 状态、Dense FFN、Sparse FFN 三类资源分别建模。' },
      { title: '按模块拆分并行策略', summary: ['Attention 使用 DP Attention，让每个 rank 维护不同请求及其 KV；必要时再叠加较小 TP 处理低 batch。', 'Dense FFN 倾向 DP，Sparse FFN 则把完整专家分布到 EP ranks；LM Head 单独处理词表与峰值显存问题。'], annotation: '这已经不是传统的 TP×PP 二维网格，而是 layer-type-aware parallelism。实现上意味着调度器、通信组和模型执行路径都要理解模块边界。', takeaway: '“混合并行”的核心是不同层采用不同通信组，而不只是并行度相乘。' },
      { title: '为什么 P/D 分离与 Wide-EP 相互强化', summary: ['Prefill 计算密集，Decode 更依赖显存带宽与大 batch；两阶段共享同一调度循环时会互相制造抖动。', 'DeepEP 在 Prefill 和 Decode 使用不同优化模式，分离后可以独立选择 high-throughput 与 low-latency 通信路径。'], annotation: 'PD 不只是资源池隔离，也是“执行策略隔离”。它允许两侧使用不同 batch、并行度、kernel、通信模式和扩缩容规则。', takeaway: '判断 PD 价值时要把可独立优化的自由度也计入收益。' },
      { title: 'EPLB 与大规模运行代价', summary: ['真实请求会让专家热度偏离训练时的均匀假设，慢 rank 会把整个 EP collective 拉成长尾。', '冗余专家和动态映射缓解热点，但会引入额外权重、副本管理与重排成本。'], annotation: 'Wide-EP 把吞吐问题变成分布式尾延迟问题。平均 expert load 不够，应该观察每层、每 rank 的 token count 分布和等待时间。', takeaway: 'EP 的主要可观测指标应包含负载偏斜和 A2A 暴露时间。' },
    ],
    questions: [
      { level: '机制', prompt: '为什么 MLA 会削弱继续扩大 TP 的 KV 容量收益？', hint: '分别看权重和 latent KV 是否能按 head 维度切分。', answer: 'TP 能切权重，但 MLA 的低秩 latent KV 并不具备足够的 KV heads 供各 rank 独立持有，常导致每个 TP rank 保存重复状态。TP 越大，权重占用下降，但重复 KV 和 collective 代价不会同比下降。' },
      { level: '推导', prompt: '给定同样 32 张 GPU，什么情况下 EP16 可能优于 EP32？', hint: '考虑 batch、节点边界、NVLink 命中比例与 A2A。', answer: '当 batch 尚不足以摊薄通信、EP32 跨越更多节点，或更多流量落到慢速网络时，新增 ranks 带来的显存与批量收益可能小于 A2A 延迟、同步长尾和小 GEMM 效率损失。' },
      { level: '设计', prompt: '设计一组实验，证明收益来自 PD 本身，而不是总 GPU 数增加。', hint: '控制硬件预算，并分别测干扰与传输成本。', answer: '固定总 GPU、模型、请求分布和并行度，比较 colocated 与 P/D；扫 input/output ratio 与到达率，记录 TTFT、TPOT、goodput、KV 传输时间、decode batch 稳定度，并用无传输或理想传输基线分离隔离收益与数据搬运代价。' },
    ], related: ['pipeline-million-context', 'vllm-wideep-h200'],
  },
  {
    slug: 'pipeline-million-context',
    no: '02', stageNo: '01', stage: '建立坐标系', source: 'LMSYS', date: '2026-01-15',
    title: 'Pipeline Parallelism in SGLang: Scaling to Million-Token Contexts and Beyond',
    shortTitle: '百万上下文：Chunked Pipeline Parallelism',
    dek: '比较 TP、PP、CP 的通信模型，并用动态 chunking 填平超长 Prefill 的流水线气泡。',
    url: 'https://www.lmsys.org/blog/2026-01-15-chunked-pipeline/', readTime: '约 28 分钟', difficulty: '高阶',
    tags: ['Pipeline Parallel', 'Chunked Prefill', 'Long Context', 'TP×PP'],
    thesis: '跨节点长上下文 Prefill 的关键不是增加同步切分，而是把 prompt 变成可流动的 microbatches，并让 P2P 传输隐藏在计算之后。',
    why: '文章不仅给结果，还从通信量、bubble ratio 与工程复杂度正面比较 TP、PP、CP，是混合并行选择题里最适合反复推导的一篇。',
    topology: 'DeepSeek-V3.1 / Qwen3-235B · H20 · PP×TP · dynamic chunking',
    sections: [
      { title: '长 Prefill 的跨节点瓶颈', summary: ['纯 TP 每层都需要 collective，跨节点放大后通信延迟直接暴露在关键路径。', '传统 PP 通信量更小，却会在 batch 不足时产生 fill/drain bubble。'], annotation: '长 prompt 同时提供了解法：把序列切成 chunks 后，即使请求数少，也能制造足够的流水线 microbatches。', takeaway: '长序列本身可以成为填充 PP 的并行维度。' },
      { title: 'Chunked PP 与异步 P2P', summary: ['模型按层分 stage，prompt 按 token chunk 切分；相邻 stage 处理不同 chunk。', '激活传输与下一 chunk 的计算重叠，避免每层一次全局同步。'], annotation: 'PP 的通信不是消失，而是从高频 collective 变成 stage 边界上的点对点传输。收益取决于是否能用计算覆盖这段传输。', takeaway: '评估 PP 要看 exposed P2P，而不是只看总通信字节。' },
      { title: '动态 chunking 如何减小 bubble', summary: ['固定 chunk 对不同序列长度和 stage 速度并不总是合适。', '动态策略逐步调整 chunk，使 pipeline 更快进入稳态，同时控制尾部 drain。'], annotation: 'chunk size 同时影响 kernel 效率、显存峰值、TTFT 和 bubble；它是一个控制变量，不是越小越好。', takeaway: 'chunk size 应随模型、拓扑和当前序列阶段变化。' },
      { title: 'PP、TP、CP 的选择边界', summary: ['TP 擅长节点内低延迟与权重切分；PP 更适合跨节点、深模型和长 Prefill。', 'CP 直接切序列维度，但需要 Attention 通信与更复杂状态管理；未来常与 PP 组合。'], annotation: '把三者画成互斥选项会误导。现实配置通常用 TP 限定在高速互联域内，再用 PP 跨域扩展，必要时用 CP/DCP 解决 KV 容量。', takeaway: '并行轴应该与硬件互联层级对齐。' },
    ],
    questions: [
      { level: '机制', prompt: '为什么一个超长请求也能让 PP 获得高利用率？', hint: '请求级 batch 不足时，还有哪个维度能产生 microbatch？', answer: '将单个 prompt 按 token 区间切成多个 chunk 后，各 pipeline stage 可以同时处理同一请求的不同 chunk，从序列维度制造并发，减少传统低 batch PP 的气泡。' },
      { level: '推导', prompt: 'PP4×TP8 为什么可能同时优于 TP32？', hint: '比较跨节点 collective 频率和 GEMM shape。', answer: 'TP32 会在每层执行跨节点 collective，并把矩阵切得更碎；PP4×TP8 将 TP 保留在节点内高速域，跨节点只在 stage 边界传激活，同时每个 stage 仍使用较大的 GEMM。' },
      { level: '设计', prompt: '如何为 1M-token Prefill 选择 chunk size？', hint: '至少列出四个相互冲突的指标。', answer: '应 sweep chunk size，联合观察首 chunk 延迟、总 TTFT、steady-state pipeline occupancy、P2P 暴露比例、kernel 效率和显存峰值；再根据 TTFT SLO 与吞吐目标选 Pareto 点，而不是只最大化 tokens/s。' },
    ], related: ['deepseek-96-h100', 'kimi-k3-sglang'],
  },
  {
    slug: 'kimi-k3-sglang',
    no: '07', stageNo: '03', stage: '前沿架构', source: 'LMSYS', date: '2026-07-27',
    title: 'SGLang and Miles Add Day-0 Support for Kimi K3',
    shortTitle: 'Kimi K3：按阶段重写并行答案',
    dek: '2.8T Hybrid KDA+MLA+LatentMoE 的完整 Serving 分析：Prefill 用 PP，Decode 用 DCP，再由 PD 组合。',
    url: 'https://www.lmsys.org/blog/2026-07-27-kimi-k3-day0-support', readTime: '约 34 分钟', difficulty: '高阶',
    tags: ['Kimi K3', 'Hybrid Attention', 'DCP', 'Chunked PP', 'PD 分离'],
    thesis: '同一个模型在 Prefill 与 Decode 阶段面对完全不同的约束，因此最优并行拓扑也必须不同。',
    why: '这是目前最接近“前沿模型 Serving 设计课本”的案例：新 Attention、新 MoE、新状态布局、超长上下文和 speculative decoding 被放进一套可组合的系统里。',
    topology: '2.8T · 1M context · PP8 Prefill · TP/DCP Decode · PD disaggregation',
    sections: [
      { title: 'K3 为什么击穿传统假设', summary: ['KDA recurrent state 与 MLA paged KV 同时存在，内存管理必须维护两种生命周期与粒度。', '896 个 LatentMoE experts、Attention Residual 和 93 层深度让路由、collective 与 kernel launch 都进入关键路径。'], annotation: '模型采用线性 Attention 并不等于“没有缓存问题”；它只是把随 token 增长的 KV 换成固定但昂贵的 recurrent state。', takeaway: '先列出模型引入的所有持久状态，再设计 block manager。' },
      { title: 'Prefill 选择深 PP', summary: ['TP 无法有效切 MLA KV，并在每层支付 AllReduce；纯 DP 又复制大量 Attention 权重。', 'PP8 让每个 rank 运行完整层和更宽 GEMM，并通过 chunk 流水与计算覆盖 stage handoff。'], annotation: 'PP4×TP2 并不自然优于 PP8：浅 pipeline 可能不足以覆盖 handoff，同时还保留 TP collective。混合得更多不代表更好。', takeaway: '减少并行轴有时能得到更清晰、更高效的关键路径。' },
      { title: 'Decode 用 DCP 扩 KV 容量', summary: ['DCP 按 token position 对 MLA KV 分片，而不是按 head 分片。', '每个 rank 只保存上下文位置的一个交错子集，逻辑上仍服务完整请求。'], annotation: 'DCP 解决的是 KV active-set ceiling，不一定降低单 token 计算延迟；KDA 的 per-request state 仍不能按 position 同样切分，会成为新的并发上限。', takeaway: '每解决一个容量瓶颈，都要重新寻找下一项不可分片状态。' },
      { title: 'PD 把异构拓扑拼接起来', summary: ['Prefill 节点运行 PP8，Decode 节点可运行 TP、DCP、EP 或多个实例。', 'Prefill:Decode 副本比例决定 aggregate throughput 与 per-user speed 的位置。'], annotation: '这里的 PD 更像 topology adapter：它允许输出为 KV/state 的一侧与消费这些状态的另一侧使用不同的 rank ownership。', takeaway: 'P/D handoff 必须显式解决 ownership 与 layout 转换。' },
    ],
    questions: [
      { level: '机制', prompt: 'DCP 与传统 Attention TP 的切分对象有何不同？', hint: '比较 head 维度与 token-position 维度。', answer: '传统 TP 常按 query/head 或隐藏维度切计算；DCP 按历史 token position 切 KV，每个 rank 保存每个请求的一部分位置，从而在 MLA head 数不足时仍能扩展 KV 容量。' },
      { level: '推导', prompt: '为什么 DCP 解决 MLA KV 后，KDA state 会成为下一道 ceiling？', hint: '哪类状态随 token，哪类状态随 request？', answer: 'MLA KV 随 token 增长且可按位置分片；KDA recurrent state 是每请求固定状态，语义上由完整历史折叠而成，无法用同一位置切分方式线性扩展。上下文容量解除后，可驻留请求数受 KDA state 限制。' },
      { level: '设计', prompt: '如果 workload 从 8K prompt 变成 256K prompt，P:D 比例应如何变化？', hint: '分别考虑 Prefill 计算量、Decode KV 容量与 OSL。', answer: '通常需要增加 Prefill capacity，因为 Prefill FLOPs 随输入显著增长；同时长上下文增加 Decode KV 占用，可能还要增加 DCP/Decode 实例。最终比例取决于 OSL 和复用率，应通过固定 SLO 下的 Pareto sweep 决定。' },
    ], related: ['pipeline-million-context', 'deepseek-96-h100', 'decode-context-parallelism'],
  },
  {
    slug: 'vllm-wideep-h200',
    no: '03', stageNo: '01', stage: '建立坐标系', source: 'vLLM', date: '2025-12-17',
    title: 'vLLM Large Scale Serving: DeepSeek @ 2.2k tok/s/H200 with Wide-EP',
    shortTitle: 'vLLM Wide-EP：从容量到通信重叠',
    dek: '用 DP Attention、DeepEP、DBO 和 EPLB 组装 DeepSeek 风格的大规模 Decode 路径。',
    url: 'https://vllm.ai/blog/2025-12-17-large-scale-serving', readTime: '约 18 分钟', difficulty: '进阶',
    tags: ['Wide-EP', 'DP Attention', 'DBO', 'EPLB', 'DeepSeek'],
    thesis: 'Wide-EP 的价值来自更大的共享显存与有效 batch，但它只有在 A2A、负载偏斜和通信暴露都被控制后才会兑现。',
    why: '它是 vLLM 视角下最紧凑的 Wide-EP 设计说明，串起了 MLA KV 复制、DP worker 调度、专家路由、双 batch 重叠和 P/D 分离。',
    topology: 'DeepSeek R1/V3 · multi-node H200 · DP Attention + EP · disaggregated serving',
    sections: [
      { title: '为什么 Attention DP、MoE EP', summary: ['Attention 按请求做数据并行，每个 worker 保有独立调度器和 KV，避免 MLA latent projection 在 TP ranks 间重复。', '专家层共享一个跨 DP workers 的 EP group，token 根据路由结果进入对应专家。'], annotation: '同一 rank 在 Attention 层表现为 DP worker，在 MoE 层又是 EP member；“并行组语义随 layer type 改变”是理解实现的关键。', takeaway: '画拓扑时应区分 Attention group 与 Expert group。' },
      { title: 'DBO 隐藏 A2A 等待', summary: ['高 EP degree 下，dispatch/combine collective 的等待会让 GPU 出现明显空洞。', 'Dual-batch Overlap 用两个 microbatches 交替推进，让一个 batch 的通信与另一个 batch 的计算重叠。'], annotation: 'DBO 不是免费并发：阈值过低会增加线程、graph 与调度开销；必须在通信占比较高的 decode shape 上触发。', takeaway: '优化目标是缩短 exposed communication，而不只是缩短 collective 本身。' },
      { title: 'EPLB 与 P/D 分离', summary: ['在线流量会产生 expert hot spots，EPLB 依据滑动窗口重映射 logical experts，并搬移权重。', 'Prefill 大批量与 Decode 小批量需要不同 DeepEP 模式，P/D 分离让两侧分别选择吞吐或时延路径。'], annotation: '负载均衡、冗余专家和 PD 都在减少 tail amplification：任意一个慢 rank 都可能延长整个 EP step。', takeaway: 'Wide-EP 的性能指标必须包含 rank-level tail，而非只有平均 TPS。' },
    ],
    questions: [
      { level: '机制', prompt: '为什么 Wide-EP 能扩大有效 KV cache？', hint: 'Attention 权重是否必须像专家一样分片？', answer: 'DP Attention 让每个 rank 处理不同请求并保存自己的 KV；专家权重则跨 ranks 分布。相比对整个模型做大 TP，它避免 MLA KV 在 TP ranks 上复制，把更多显存留给不同请求的 KV。' },
      { level: '推导', prompt: 'DBO 在什么情况下可能无收益甚至退化？', hint: '考虑小 EP、低通信占比和 microbatch 大小。', answer: '当 A2A 很短、batch 太小、计算本身占主导或 microbatch 切分破坏 GEMM 效率时，重叠空间不足，线程切换、同步与 graph 管理开销会超过被隐藏的通信。' },
      { level: '设计', prompt: '如何判断应该增加 redundant experts，还是缩小 EP size？', hint: '一个解决 skew，一个减少通信域。', answer: '同时 sweep EP degree 与冗余数，观察 KV capacity、expert token 分布、A2A 时间和尾延迟。若主要问题是少数热点 rank，冗余更直接；若跨节点通信普遍占主导且 batch 不足，缩小 EP 更有效。' },
    ], related: ['deepseek-96-h100', 'blackwell-wideep'],
  },
  {
    slug: 'single-node-pd-mori',
    no: '04', stageNo: '02', stage: '拆开 P 与 D', source: 'vLLM', date: '2026-04-07',
    title: 'Next-Level Inference: Why Your Single-Node vLLM Setup Needs Prefill-Decode Disaggregation',
    shortTitle: '单节点 P/D：把 KV Push 与 Pull 走一遍',
    dek: '在 8×MI300X 上拆成 4P+4D，用 MORI-IO 展开完整请求流和 goodput 权衡。',
    url: 'https://vllm.ai/blog/2026-04-07-moriio-kv-connector', readTime: '约 24 分钟', difficulty: '入门',
    tags: ['PD 分离', 'KV Transfer', 'RDMA', 'Goodput', 'MI300X'],
    thesis: 'PD 的最小成立条件不是“大集群”，而是隔离收益必须大于 KV handoff 与资源碎片的代价。',
    why: '文章把抽象架构拆成 proxy、prefill、decode 三个服务，并按时间顺序解释 push/pull，是理解 vLLM KV connector 行为最好的入口。',
    topology: 'Qwen3-235B · 8×MI300X · 4 GPU Prefill + 4 GPU Decode · MORI-IO',
    sections: [
      { title: '共置时的 Head-of-Line Blocking', summary: ['长 Prefill 会拉长正在 Decode 请求的 inter-token latency，Decode 批次也会延迟新 Prefill。', '把 GPU 固定分给 P 与 D 后，Decode batch composition 更稳定，ITL 更可预测。'], annotation: 'PD 优化的常常是 SLO-compliant goodput，不是裸吞吐。若只比较平均 tokens/s，可能完全看不到它的价值。', takeaway: '先定义 TTFT/ITL 约束，再讨论 PD 是否值得。' },
      { title: 'Pull 与 Push 两种请求流', summary: ['Pull 模式先完成 Prefill，再把 block IDs 交给 Decode，由 Decode 发起 RDMA READ。', 'Push 模式同时调度两侧，Prefill 边计算边把各层 KV 写入 Decode 预分配内存。'], annotation: '两种模式的差异不仅是 RDMA verb，而是控制流：串行 dispatch 简单却增加 proxy 等待；并行 dispatch 需要更早完成内存与 ownership 协议。', takeaway: '画 PD 时必须同时画控制消息和 KV 数据流。' },
      { title: 'TTFT 代价与 Goodput 收益', summary: ['KV 传输与 proxy 协调可能增加 TTFT，尤其在低负载或短 prompt 下。', '高负载时，稳定 Decode ITL 能显著增加满足 SLO 的请求数。'], annotation: 'PD 没有普适胜利区间。应把输入长度、输出长度、到达率和网络带宽作为四个主要 sweep 维度。', takeaway: '部署决策应基于 Pareto 曲线，而不是单个峰值数字。' },
    ],
    questions: [
      { level: '机制', prompt: 'Push 模式为何通常比 Pull 更容易降低 handoff latency？', hint: 'KV 能否与 Prefill layer computation 重叠？', answer: 'Push 可以提前为 Decode 分配目标缓冲，并在 Prefill 逐层完成时立即写出 KV，从而让传输与后续层计算重叠；Pull 通常要等待 Prefill 完成和 block metadata 返回后才能开始。' },
      { level: '推导', prompt: '短 prompt、低 QPS 时为什么 colocated 可能更优？', hint: '隔离收益与固定 handoff 成本谁占主导？', answer: '低负载时几乎没有 Prefill 干扰 Decode，PD 却仍要承担 proxy、同步、KV 搬运和固定 GPU 划分造成的碎片，因此 TTFT 和总体利用率可能更差。' },
      { level: '设计', prompt: '怎样在线决定请求走 colocated 还是 PD 池？', hint: '用请求成本预测和两个池的实时状态。', answer: '根据预测 prompt 长度、output budget、prefix hit、当前 queue、KV headroom 与传输带宽估算两条路径的 TTFT/ITL；为长 Prefill 或严格 ITL 请求优先 PD，并持续用完成反馈校准路由模型。' },
    ], related: ['hybrid-ssm-disagg', 'pd-multiplexing'],
  },
  {
    slug: 'hybrid-ssm-disagg',
    no: '05', stageNo: '02', stage: '拆开 P 与 D', source: 'vLLM', date: '2026-04-21',
    title: 'Disaggregated Serving for Hybrid SSM Models in vLLM',
    shortTitle: 'Hybrid SSM 的异构状态传输',
    dek: '当 Full Attention KV 与 Mamba recurrent/conv state 共存时，重建 NIXL descriptor 与 block 语义。',
    url: 'https://vllm.ai/blog/2026-04-21-hybrid-ssm-disagg', readTime: '约 26 分钟', difficulty: '高阶',
    tags: ['Hybrid SSM', 'NIXL', 'State Transfer', 'Block Layout', 'Heterogeneous TP'],
    thesis: 'P/D 分离的真正抽象不应是“搬 KV”，而应是按模型状态类型描述 ownership、布局、粒度和可传输区域。',
    why: '它直接进入 connector 和 block manager 的数据结构层，解释 hybrid model 为什么让统一 KV block 假设失效，也是理解后续 Qwen3.5、Kimi K3 支持的技术底座。',
    topology: 'Nemotron-H class · Full Attention + Mamba SSM · NIXL RDMA · heterogeneous TP',
    sections: [
      { title: '一种 KV 格式的抽象失效', summary: ['FA KV 随 token 增长并分页；SSM state 通常按 request 固定，且包含 recurrent 与 convolution state。', '原有 connector 假设统一 block 大小和布局，无法正确描述两类状态。'], annotation: '这类 bug 往往不是 kernel 错，而是“逻辑 block”与“物理内存区域”被错误等同。', takeaway: '状态传输协议必须把语义粒度和物理布局分开。' },
      { title: 'Dual Descriptors 与 Block Bridging', summary: ['两套 descriptor 以不同 offset/size 索引同一物理 HMA buffer，分别服务 FA 和 SSM。', 'logical-to-physical mapping 处理 block manager 粒度与 kernel 所需物理 block 的不一致。'], annotation: '共享底层 tensor 避免额外 buffer 和 permutation，但也要求 metadata handshake 精确携带每种 view 的布局。', takeaway: '零拷贝设计通常把复杂度转移到 metadata 正确性。' },
      { title: '异构 TP 的三段 Conv Transfer', summary: ['P 与 D 的 TP degree 不同时，conv state 在 sender/receiver 上的分片形状不同。', '将连续区域分解成多个 descriptors，可在不让 sender 先重排的情况下完成传输。'], annotation: '异构并行度是 PD 最重要却最容易忽略的能力；否则两侧虽然分离，仍被迫使用同一拓扑。', takeaway: '验证需要覆盖 TP-P ≠ TP-D，而不只是同构 happy path。' },
    ],
    questions: [
      { level: '机制', prompt: '为什么 FA KV 与 SSM state 不能共享一种 block descriptor？', hint: '比较增长维度、生命周期和物理布局。', answer: 'FA KV 以 token block 增长，SSM recurrent/conv state 更接近 per-request 固定状态，两者 block 大小、offset、有效区域和 TP 分片方式都不同；强行统一会造成错位、冗余传输或错误状态。' },
      { level: '推导', prompt: '零额外 buffer 为什么可能提升性能，却提高正确性风险？', hint: '数据移动少了，metadata 责任变大。', answer: '复用同一物理 tensor 可消除 staging copy 和 permutation，但所有 offset、长度、block ownership 与 tail region 都必须由 descriptors 正确表达；任何映射错误都可能读取陈旧或属于其他请求的数据。' },
      { level: '设计', prompt: '为 hybrid PD connector 设计最关键的五类测试。', hint: '覆盖模型、布局、并行度、边界和生命周期。', answer: '至少覆盖纯 FA 回归、混合层布局、P/D 同构与异构 TP、partial/final block、取消与 block reuse；再加入跨节点传输失败、重复 handshake 和数值一致性检查。' },
    ], related: ['single-node-pd-mori', 'qwen35-disagg'],
  },
  {
    slug: 'gb300-long-context',
    no: '06', stageNo: '02', stage: '拆开 P 与 D', source: 'LMSYS', date: '2026-02-19',
    title: 'Deploying DeepSeek on GB300 NVL72: Big Wins in Long-Context Inference',
    shortTitle: 'GB300 长上下文：PP Prefill + Wide-EP Decode',
    dek: '围绕 128K/8K workload，把 P/D、Chunked PP、Wide-EP、MTP 与硬件能力组合成一条完整路径。',
    url: 'https://www.lmsys.org/blog/2026-02-19-gb300-longctx/', readTime: '约 22 分钟', difficulty: '高阶',
    tags: ['Long Context', 'PP Prefill', 'Wide-EP', 'MTP', 'Dynamo'],
    thesis: '长上下文 serving 的 P 侧受 TTFT 与 Attention compute 约束，D 侧受 KV capacity 与带宽约束，因此必须使用不同扩展方向。',
    why: '这是阶段异构设计的优秀端到端案例，文章同时给出 P/D 控制面、TTFT、batch capacity、TPS/GPU 与 TPS/user 的取舍。',
    topology: 'DeepSeek R1 NVFP4 · GB300 NVL72 · PP Prefill · Wide-EP Decode · Dynamo',
    sections: [
      { title: 'Prefill：用 PP 扩展长序列计算', summary: ['128K prompt 让 Prefill Attention 和 TTFT 成为第一瓶颈。', 'Chunked PP 与动态 chunking 将长 prompt 流水化，并配合更快 Attention kernel。'], annotation: '此时 Prefill 的目标不只是最大吞吐，还要控制单请求 fill/drain 与首 token 时间。', takeaway: 'P 侧应同时报告 input TPS 与 TTFT。' },
      { title: 'Decode：更大 HBM 转化为 Batch', summary: ['长上下文让每个请求的 KV footprint 增大，Decode 容量首先受可驻留请求数限制。', 'Wide-EP 与更多 HBM 提高有效 batch，并摊薄 MoE GEMM 与权重读取。'], annotation: 'HBM 容量收益只有在调度器能稳定维持大 batch、且 A2A 未成为瓶颈时才会变成 TPS。', takeaway: '容量、batch 和通信必须形成闭环解释。' },
      { title: 'MTP 与控制面的角色', summary: ['MTP 减少目标模型迭代次数，可提升 per-user decode speed，但收益依赖接受率和 batch。', 'Dynamo 协调 P/D workers、KV-aware routing、生命周期和前后处理。'], annotation: '当数据面被拆散后，控制面不再是外围组件：它决定 KV 去哪、worker 何时可用，以及失败后状态如何回收。', takeaway: 'PD benchmark 应把路由与状态管理开销包含在端到端指标内。' },
    ],
    questions: [
      { level: '机制', prompt: '为什么长上下文 Decode 更容易成为 KV-capacity-bound？', hint: '每个活跃请求的历史状态随 ISL 如何变化？', answer: 'Decode 必须为每个活跃请求保留完整历史 Attention 状态。ISL 增长会线性抬高单请求 KV footprint，降低可并发 batch；即使每步计算相近，容量和 KV 访问都会恶化。' },
      { level: '推导', prompt: '增加 HBM 后 TPS 为什么不一定按容量同比增长？', hint: '更大 batch 会触发哪些新的瓶颈？', answer: '更大 batch 可能让 MoE A2A、Attention bandwidth、调度开销或专家 skew 成为新瓶颈；同时延迟 SLO 可能不允许把 batch 填到容量上限。' },
      { level: '设计', prompt: '如何为 128K/8K 和 8K/128K 两类 workload 规划不同 P:D 比例？', hint: '比较输入计算和输出驻留时间。', answer: '128K/8K 需要更高 Prefill capacity 与 PP 扩展；8K/128K 则让请求长时间占用 Decode KV 和执行步数，需要更多 Decode capacity。两者都应在目标 TTFT/TPOT 下按真实到达率求 Pareto 配比。' },
    ], related: ['pipeline-million-context', 'glm52-production'],
  },
  {
    slug: 'kimi-k3-vllm',
    no: '08', stageNo: '03', stage: '前沿架构', source: 'vLLM', date: '2026-07-27',
    title: 'Kimi K3 Is Here: Efficient Day-0 Support on vLLM',
    shortTitle: 'Kimi K3：vLLM 的 TEP→DEP 路径',
    dek: '从 KDA cache、Sequence Parallel TEP 到 DEP Decode，观察另一套 K3 Serving 组合。',
    url: 'https://vllm.ai/blog/2026-07-27-k3', readTime: '约 32 分钟', difficulty: '高阶',
    tags: ['Kimi K3', 'TEP', 'DEP', 'Hybrid Cache', 'DSpark'],
    thesis: '服务 hybrid 2.8T MoE 的难点不是让每个功能单独可用，而是保证 cache、并行、speculation 与 P/D 在同一状态语义下组合。',
    why: '与 LMSYS K3 文章并读价值最大：同一模型、不同实现选择，可以区分模型强制约束与框架自身设计偏好。',
    topology: 'Kimi K3 · TEP8 Prefill → DEP16 Decode · NIXL · MXFP4 · DSpark',
    sections: [
      { title: 'Hybrid Prefix Cache 的新语义', summary: ['KDA 固定 recurrent state 与 MLA token-level KV 必须在同一逻辑 prefix 上对齐。', 'physical state block 可以比 prefix-match granularity 更大，从而既避免每小块保存完整 recurrent state，又保留 partial hit。'], annotation: '缓存命中不再等价于“找到连续 KV blocks”；它还必须证明 recurrent state 恰好对应命中边界。', takeaway: 'Hybrid cache 需要同时定义匹配粒度与状态物化粒度。' },
      { title: 'Sequence Parallel TEP Prefill', summary: ['Attention 走 TP、MoE 走 EP，TEP 可保留完整 experts 并改善 expert GEMM。', 'Sequence parallel 把 token ownership 分给 ranks，减少 attention residual 的重复物化，并在必要位置 all-gather。'], annotation: 'TEP 的风险是每层多个 collective。Sequence parallel 的目标不是减少模型计算，而是减少 rank 间重复数据和同步。', takeaway: '分析混合并行要精确到每层 collective 的位置与 tensor shape。' },
      { title: 'DEP Decode 与 DSpark 的兼容', summary: ['高吞吐路径让 Attention 数据并行、experts 跨 ranks 分片，并使用适合拓扑的 MoE/A2A backend。', 'DSpark draft 被设计成与目标 MLA cache layout 相容，避免 speculative path 破坏 PD 与高级 KV 管理。'], annotation: 'speculative decoding 常被当作独立插件，但在 hybrid model 上 draft/verify/rollback 都会触碰多种状态；布局兼容比算法接受率更基础。', takeaway: '所有加速路径都必须复用同一套状态提交协议。' },
    ],
    questions: [
      { level: '机制', prompt: '为什么 hybrid prefix cache 要区分 match granularity 与 state block size？', hint: '小粒度命中与大 recurrent state 的存储成本冲突。', answer: '细粒度 match 能提高命中率，但若每个小块都快照完整 KDA state，存储成本会爆炸；分离后可在小 token 粒度查找，只在更粗的合法边界保存/恢复 recurrent state。' },
      { level: '推导', prompt: 'TEP 相比纯 TP 的收益与新增代价分别是什么？', hint: '比较 experts 是否完整以及每层 collective 数量。', answer: 'TEP 把完整 experts 放在不同 ranks，改善 MoE GEMM shape 并减少专家内部 TP；代价是 Attention TP 与 Expert EP 使用不同通信语义，可能在每层引入额外 all-reduce/all-gather 和 token dispatch。' },
      { level: '设计', prompt: '如何比较 LMSYS 的 PP Prefill 与 vLLM 的 TEP Prefill？', hint: '控制模型、硬件与 workload，并拆解 compute/communication。', answer: '固定 K3 checkpoint、硬件域、precision、chunk 和请求分布，对 PP8 与 TEP8 sweep concurrency/ISL；记录 TTFT、input TPS、GEMM efficiency、collective/P2P exposed time、显存和启动复杂度，按 SLO 取 Pareto，而非只比较峰值。' },
    ], related: ['kimi-k3-sglang', 'hybrid-ssm-disagg'],
  },
  {
    slug: 'qwen35-disagg',
    no: '09', stageNo: '03', stage: '前沿架构', source: 'vLLM', date: '2026-08-06',
    title: 'vLLM Reaches 25K Total TPS/GPU on Qwen3.5',
    shortTitle: 'Qwen3.5：GDN + Attention 的 P/D Serving',
    dek: '用 Blackwell GDN kernels、Hybrid Memory Allocator 与 race-free async scheduling 完成高吞吐分离部署。',
    url: 'https://vllm.ai/blog/2026-08-06-qwen35-25k-tps', readTime: '约 18 分钟', difficulty: '高阶',
    tags: ['Qwen3.5', 'GDN', 'HMA', 'NIXL', 'Async Scheduling'],
    thesis: 'Hybrid Attention 的性能上限同时取决于新算子的 kernel、异构状态的传输效率，以及 scheduler 对传输完成事件的正确排序。',
    why: '它把底层 hybrid-state 支持与端到端 Pareto benchmark 连起来，能看到一次模型支持如何从 kernel、allocator、connector 一直延伸到调度器。',
    topology: 'Qwen3.5-397B-A17B NVFP4 · GB200 NVL72 · disaggregated serving',
    sections: [
      { title: 'GDN Prefill 的硬件专用路径', summary: ['GDN 与 Full Attention 交错，使 Prefill 不再由单一 Attention kernel 代表。', 'Blackwell 优化 kernel 显著缩短 GDN 部分，但端到端收益还取决于其在总时间中的占比。'], annotation: 'microbenchmark 的倍数不能直接外推系统速度；应使用 Amdahl 视角确认优化部分在整条 Prefill path 的权重。', takeaway: '每个 kernel 优化都应配一项端到端指标。' },
      { title: 'HMA 与状态 Descriptor 压缩', summary: ['Hybrid Memory Allocator 将不同 layer state 映射到正确物理区域。', 'NIXL 只传输属于对应 layer type 的有效区域，减少 descriptors 与无效数据。'], annotation: 'descriptor 数量本身也会成为 control-plane overhead；减少它既降低 handshake/launch 开销，也简化 completion tracking。', takeaway: 'PD 性能要同时看 bytes、descriptor count 与 completion latency。' },
      { title: '异步调度中的 Race', summary: ['KV/state transfer、scheduler step 与 request lifecycle 并发推进时，错误事件顺序会产生竞态。', '修复需要明确请求何时可进入 Decode batch、何时释放 P 侧状态，以及失败如何回滚。'], annotation: '把同步改成异步后，吞吐问题会转化为状态机正确性问题。每个事件都需要 idempotency 与明确 ownership。', takeaway: '异步优化必须附带 happens-before 关系图。' },
    ],
    questions: [
      { level: '机制', prompt: '为什么减少 NIXL descriptor 数量可能在传输字节变化不大时仍提升性能？', hint: 'descriptor 也有创建、交换、提交和轮询成本。', answer: '每个 descriptor 会带来 metadata、队列提交和 completion tracking 开销。大量小 descriptors 会增加 CPU/control-path 与 NIC work request 压力，因此合并或精确过滤可降低固定成本。' },
      { level: '推导', prompt: 'GDN kernel 快 5×，为什么端到端 Prefill 可能只快十几个百分点？', hint: '使用 Amdahl 定律。', answer: '只有 GDN kernel 占用的那部分时间能获得加速；其他投影、MoE、通信、调度和数据移动保持不变。若被优化部分只占总路径的一小部分，总体上限自然有限。' },
      { level: '设计', prompt: '怎样验证 async scheduling 修复没有引入 silent corruption？', hint: '不能只跑吞吐 benchmark。', answer: '加入可控传输延迟/失败、请求取消、block reuse、P/D 重启和高并发随机化测试；对比 colocated 数值结果，记录 state version/ownership，并使用长时间 stress 与 sanitizer-style invariant checks。' },
    ], related: ['hybrid-ssm-disagg', 'kimi-k3-vllm', 'decode-context-parallelism'],
  },
  {
    slug: 'decode-context-parallelism',
    no: '10',
    stageNo: '03',
    stage: '前沿架构',
    source: 'vLLM',
    date: '2026-08-07',
    title:
      'Efficient Decode Context Parallelism with vLLM for Long Context Workloads',
    shortTitle: 'Decode Context Parallelism：让 KV 沿序列切分',
    dek: '当 TP 已无法继续切分 MLA / GQA 的 KV cache，DCP 改沿 token position 分片，用轻量 Decode 通信换取更高的长上下文并发。',
    url: 'https://vllm.ai/blog/2026-08-07-decode-context-parallelism',
    readTime: '约 20 分钟',
    difficulty: '高阶',
    tags: ['DCP', 'Long Context', 'MLA', 'GQA', 'KV Cache'],
    thesis:
      'DCP 不是让单条长序列的 Attention 无通信，而是在 TP 的 KV-head 切分到达下限后，把原本重复的 KV 副本改成不同的序列分片，以小尺寸 Query 和 partial-output 归约换取近似按 DCP degree 缩小的单卡 KV 占用。',
    why: '文章把 DCP 的适用边界、通信闭环与 MLA / GQA 的不同约束讲得很完整；同一组 8×B200 实验也直接展示了“省下 KV → 提高并发 → 抬高吞吐”的因果链。',
    topology: '8×B200 · Kimi K2.6 NVFP4 · TP8 / DCP8 · 64K–1M context',
    sections: [
      {
        title: 'TP 的 KV 切分为何触底',
        summary: [
          'GQA 只能先按 KV head 切分；当 TP 超过 KV-head 数后，额外 ranks 开始保存重复 head，而不是继续缩小单卡 KV。',
          'MLA 把 K/V 压成所有 query heads 共享的一份 latent，相当于只有一个 KV head；纯 TP 因而会在每个 rank 上复制整份 latent KV。',
        ],
        annotation:
          '这里要把参数权重和请求状态分开看：扩大 TP 仍能切权重与投影计算，但 KV 这项随上下文和并发增长的状态已经停止缩小。DCP 针对的正是这个 state-sharding ceiling。',
        takeaway: '判断 TP 是否还有效，必须分别检查 weight shard 与 KV shard。',
      },
      {
        title: 'DCP：按 token position 分片',
        summary: [
          'DCP 不再寻找更多 head，而是把同一请求的历史位置分给多张 GPU；例如 200K tokens 可由四个 ranks 各保存 50K。',
          'Decode 时每个 rank 都参与这个请求，但只读取本地那一段 KV，并计算该位置区间对当前 query 的部分 Attention。',
        ],
        annotation:
          '这与 DP Attention 按请求切分不同：DP worker 各自拥有不同请求的完整 KV；DCP 则把一个请求的 KV 横跨多个 ranks。前者扩大请求级独立性，后者解决单请求或长上下文 batch 的单卡状态上限。',
        takeaway:
          'DCP 的切分对象是 request 内的 context positions，而不是 requests。',
      },
      {
        title: '一次 Decode 的通信闭环',
        summary: [
          '先在 DCP group 内 AllGather 当前 token 的 Query，让每个 KV 分片都能用完整 query 与本地历史做 Attention。',
          '随后交换各 rank 的 partial output 与 LSE，用 online-softmax 权重合并不同序列片段，再 ReduceScatter 回每个 rank 所需的 head slice；MLA 还可复制较小的 Q projection 来省掉首次 AllGather。',
        ],
        annotation:
          '局部 softmax 结果不能直接相加或平均，因为每个分片的归一化分母不同；LSE 提供了把局部最大值和分母恢复成全局 softmax 的数值稳定权重。DCP 实质上是用 decode 阶段的小 activation collective，换取大得多的持久 KV 不再复制。',
        takeaway:
          '通信虽没有消失，但被压缩到单 token Query 和 Attention 归约。',
      },
      {
        title: 'MLA、GQA 的上限与收益边界',
        summary: [
          'MLA 的有效 KV-head 数为 1，因此 DCP 可扩到 TP degree（且 TP 必须能被 DCP 整除）；GQA 只能利用 TP / KV-head 数产生的重复副本，DCP 上限由这部分冗余决定。',
          '8×B200 上的 Kimi K2.6 实验中，纯 TP 在 concurrency 64 时耗尽 KV，并停在约 1,863 tok/s/GPU；DCP 在 concurrency 512 时仍为 82% KV 使用率，并达到约 6,091 tok/s/GPU。',
        ],
        annotation:
          '吞吐提升主要来自释放显存后能容纳更大 batch，而不是 DCP 必然缩短一次 decode step。长上下文、KV 已复制、高并发且互联带宽高时收益最大；短上下文或低并发时，新增 collective 可能得不偿失。',
        takeaway:
          '用 throughput–interactivity Pareto frontier 选择 DCP，而不是只看峰值 TPS。',
      },
    ],
    questions: [
      {
        level: '机制',
        prompt:
          'DCP 已经按序列分了 KV，为什么还需要 Query AllGather 和 output/LSE 归约？',
        hint: '分别问：每个 KV 分片需要什么 Query，以及局部 softmax 能否直接相加。',
        answer:
          'TP 之后每个 rank 起初只持有 query/head 的一部分，但每个序列分片都要用完整 Query 对本地 Keys 打分，所以先 AllGather Q。各 rank 得到的 Attention output 又只覆盖局部 positions，且 softmax 分母不同，必须交换 output 与 LSE 做全局重加权，再 ReduceScatter 回目标 head slice。',
      },
      {
        level: '推导',
        prompt:
          'DCP8 把单卡 KV 理论上缩到 1/8，为什么吞吐通常不会自动提升 8 倍？',
        hint: '省下的是容量；系统还受哪些计算、通信和 SLO 约束？',
        answer:
          'DCP 直接改善的是 KV 容量，从而允许更高 concurrency 和 batch。吞吐仍受 Attention/FFN 计算、模型权重带宽、DCP collectives、调度开销、请求长度分布和 TPOT SLO 限制；只有新增 batch 能被计算高效消费且通信未暴露时，容量收益才会转化为 TPS。',
      },
      {
        level: '设计',
        prompt:
          '面对 200K context 的 MLA 服务，如何在 DP Attention、DCP 与 P/D 分离之间做选择？',
        hint: '区分请求级 ownership、单请求 KV ceiling 与 Prefill/Decode 的阶段差异。',
        answer:
          '若单个 DP worker 的 KV 足以容纳目标 batch，优先用请求级 DP 获得独立调度和少通信；若 MLA KV 在 TP ranks 上复制并限制并发，则在每个 Decode worker group 内加入 DCP。若长 Prefill 的计算拓扑与 Decode 的 DCP/容量拓扑明显不同，再用 P/D 分离让 P 侧选 PP/TP、D 侧选 TP×DCP，并把 KV layout 转换与传输计入端到端 SLO。',
      },
    ],
    related: ['kimi-k3-sglang', 'pipeline-million-context', 'qwen35-disagg'],
  },
  {
    slug: 'deepseek-v4-pro',
    no: '11', stageNo: '03', stage: '前沿架构', source: 'LMSYS', date: '2026-08-19',
    title: 'Pushing the Limits of Serving DeepSeek-V4-Pro',
    shortTitle: 'DeepSeek-V4-Pro：一个模型，多套 Serving Profile',
    dek: '在 H20 约束下分别优化长 Prefill、低延迟 Decode 与高吞吐 Decode，而不是寻找万能配置。',
    url: 'https://www.lmsys.org/blog/2026-08-19-deepseek-v4-pro-engine-optimization-h20', readTime: '约 36 分钟', difficulty: '高阶',
    tags: ['DeepSeek V4 Pro', 'Serving Profiles', 'PP×TP', 'DP×EP', 'DSpark'],
    thesis: '模型部署的产物不应是一条启动命令，而应是覆盖不同 workload 与 SLO 区间的一组可解释 profiles。',
    why: '文章罕见地把“为什么不用 EP”“为什么低延迟用 PP2-TP8”“为什么高吞吐用 DP32-EP32”放在同一套硬件限制中比较。',
    topology: '1.6T MoE · H20 96/141GB · PP Prefill · PP×TP latency decode · DP×EP throughput decode',
    sections: [
      { title: '从硬件约束定义 Profiles', summary: ['H20 缺少 Blackwell 的原生 FP4 与更大 HBM，权重 footprint、KV capacity 和通信更紧张。', '短输入、百万上下文、batch-1 与高并发需要不同目标函数。'], annotation: '“同模型同卡型”仍不足以决定配置；workload distribution 和 SLO tier 才是 profile 的索引。', takeaway: '配置系统应按 workload envelope 组织，而非按模型名组织。' },
      { title: 'Prefill 为什么选择 MoE-TP', summary: ['大 Prefill batch 下 token 分布可能让 EP rank 出现专家 skew 与同步长尾。', 'MoE-TP 让每个 rank 对相同 routed tokens 执行切分计算，牺牲一些通信换取可预测平衡。'], annotation: 'EP 不是 MoE 的唯一正确答案。Prefill token 多、计算密集且对负载不均敏感时，TP 的规则性可能更有价值。', takeaway: '并行策略应依据实际 routing shape，而不是模型标签。' },
      { title: '两种 Decode Frontier', summary: ['低延迟路径用 PP2-TP8 与 DSpark，围绕 batch 1 和 TPOT 优化关键链。', '高吞吐路径用 DP/EP、量化、更多 KV capacity 与 overlap，面向大并发。'], annotation: '这两条曲线优化的是不同目标，不应被压成一个“最佳 TPS”排名。正确产物是带 SLO 条件的 Pareto frontier。', takeaway: 'Latency frontier 与 throughput frontier 必须分别测量和运营。' },
    ],
    questions: [
      { level: '机制', prompt: '为什么 MoE-TP 在 Prefill 可能比 MoE-EP 更稳定？', hint: '考虑 expert skew 是否会变成 rank skew。', answer: 'EP 将不同 experts 放在不同 ranks，routing 偏斜会造成 rank 工作量差异并被 collective 放大；TP 让 ranks 对同一 routed token 集合做规则切分，工作更一致，代价是更频繁同步。' },
      { level: '推导', prompt: '为何 batch-1 低延迟路径可能选择 PP2-TP8，而不是更大的 EP？', hint: '小 batch 无法摊薄哪些成本？', answer: 'batch 1 下 expert GEMM 很小，Wide-EP 的 A2A 与同步成本难以摊薄；较小 TP 域配合 PP 可切下模型容量并保留更可预测的关键路径，再用 speculative decoding 减少 step 数。' },
      { level: '设计', prompt: '如何把多 profile 部署接入在线 router？', hint: '需要请求特征、实时容量和反馈闭环。', answer: '按 ISL、预测 OSL、priority/SLO、prefix hit 与并发成本分类，再结合各 profile 的 queue、KV headroom 和健康度路由；设置 fallback 与 admission control，并根据完成请求的 TTFT/TPOT 反向校准分类边界。' },
    ], related: ['deepseek-h20-practices', 'glm52-production'],
  },
  {
    slug: 'glm52-production',
    no: '12', stageNo: '04', stage: '走向生产', source: 'vLLM', date: '2026-07-23',
    title: 'From Day 0 to Production SLAs: Serving GLM-5.2 on 24 NVIDIA B300 GPUs with vLLM',
    shortTitle: 'GLM-5.2：从 Day-0 到生产 SLA',
    dek: '以 TTFT≤2.5s、TPOT≤20ms 为硬约束，解释为何最终上线拓扑不是原始吞吐最高的那一个。',
    url: 'https://vllm.ai/blog/2026-07-23-glm-5.2-nvfp4-b300-pd', readTime: '约 28 分钟', difficulty: '进阶',
    tags: ['GLM-5.2', 'SLA', '4P1D', 'MTP', 'Observability'],
    thesis: '生产 Serving 的目标函数是约束下的 goodput；任何提升峰值 TPS 却破坏 TTFT/TPOT 或稳定性的配置都不是更优解。',
    why: '这是一篇非常少见的完整上线复盘，包含问题定位、每项优化增益、最终命令、精度验证与长稳观察。',
    topology: 'GLM-5.2 NVFP4 · 24×B300 · 4 Prefill instances → 1 Decode instance',
    sections: [
      { title: '把 PD 当成 SLA 起点', summary: ['共置时长 Prefill 会让所有同 batch Decode 请求的 TPOT 随输入分布抖动。', '分离后 Decode critical path 只由 Decode batch composition 决定。'], annotation: '文章不是先证明 PD 提升平均吞吐，而是先证明它让延迟成为可控制变量；这是生产论证更正确的顺序。', takeaway: '先消除不可控干扰，再优化均值。' },
      { title: 'P/D Handoff 的 Mixed Batch', summary: ['新到 Decode 的请求与已有 speculative requests 组成不同状态的 batch，padding/shape 处理会拉高 step 时间。', '针对 handoff 的 padding 与 runner、A2A、CUDA Graph 调优逐步降低 TPOT。'], annotation: '系统瓶颈经常出现在两个优化模块的交界处，而不是模块内部：这里正是 PD handoff 与 speculative decoding 的组合边界。', takeaway: '组合功能必须单独 profile，不能假设收益可相乘。' },
      { title: '为什么不选最高吞吐 Prefill', summary: ['不同 Prefill parallelism 在峰值 input TPS、TTFT 和资源配比上存在冲突。', '最终选择满足整体 4P1D 和 Decode SLA 的配置，而非孤立 Prefill benchmark 冠军。'], annotation: '局部最优会改变 P:D queue balance，甚至让 Decode 等待或 Prefill 堆积。应从端到端稳态而非单池峰值做决策。', takeaway: '资源配比和并行度必须联合搜索。' },
    ],
    questions: [
      { level: '机制', prompt: '为什么 PD 能让 TPOT 从输入长度分布中解耦？', hint: 'Decode step 中是否仍执行新请求的 Prefill tokens？', answer: 'P/D 分离后，长 prompt 只在 Prefill workers 执行，Decode workers 接收已生成状态并只推进输出 token，因此正在生成请求的 step 不再被新 prompt 的计算量直接拉长。' },
      { level: '推导', prompt: '局部最高 Prefill TPS 为什么可能降低系统 goodput？', hint: '考虑 TTFT、资源占比与 P:D 队列平衡。', answer: '该配置可能需要更多 GPU、产生更高 TTFT 或以大 batch 才达峰值，从而挤压 Decode capacity、造成 handoff burst；端到端满足双 SLO 的请求数反而下降。' },
      { level: '设计', prompt: '为 PD+MTP 设计一套上线观测面板。', hint: '覆盖入口、P、handoff、D、speculation 和结果。', answer: '至少包括 request rate/length、P queue 与 TTFT、KV/state transfer bytes/latency/failures、D queue/batch/TPOT、draft acceptance 与 verify cost、A2A exposed time、KV usage、错误率和 SLO goodput，并按 profile/长度分桶。' },
    ], related: ['gb300-long-context', 'deepseek-h20-practices'],
  },
  {
    slug: 'deepseek-h20-practices',
    no: '13', stageNo: '04', stage: '走向生产', source: 'LMSYS', date: '2025-09-26',
    title: 'Together with SGLang: Best Practices for Serving DeepSeek-R1 on H20-96G',
    shortTitle: 'DeepSeek on H20：EP Degree 与 SLA 分层',
    dek: '用真实 batch、跨节点通信比例和三档 SLA，解释为什么 EP16 可能胜过 EP32。',
    url: 'https://www.lmsys.org/blog/2025-09-26-sglang-ant-group/', readTime: '约 24 分钟', difficulty: '进阶',
    tags: ['H20', 'EP16', 'MTP', 'Tiered SLA', 'Production'],
    thesis: 'EP degree 的最优点由 batch、拓扑和 SLA 共同决定；更多 GPUs 只有在本地通信比例与计算利用率保持良好时才等于更高效率。',
    why: '文章给出了非常具体的部署和 batch sweep，并把微观性能结论落到 Base/Pro/Max 三档线上服务。',
    topology: 'DeepSeek R1 · H20-96GB · Prefill TP8 · Decode Attention-DP16 + MoE-EP16',
    sections: [
      { title: 'Prefill 与 Decode 的独立配置', summary: ['Prefill 使用单节点 TP8，强调计算吞吐与避免跨节点 collective。', 'Decode 采用两节点 Attention-DP16 + MoE-EP16，利用更大 KV capacity 与专家分片。'], annotation: '这体现一个实用原则：把高频 collective 限制在最快互联域，把跨节点通信留给更能从聚合 batch 获益的部分。', takeaway: '硬件拓扑应直接映射到通信组边界。' },
      { title: 'EP16 为什么能超过 EP32', summary: ['EP32 让更多 MoE traffic 离开 NVLink 域并走跨节点网络。', 'batch 增大后，EP16 的 GEMM 足够饱满，而 EP32 仍支付更高 A2A 与同步成本。'], annotation: 'EP 扩展有一个“容量/批量收益”与“通信域扩张”交叉点。它必须用目标 batch sweep，而不能由 GPU 数直觉决定。', takeaway: '报告 EP 性能时必须附带 batch 与拓扑。' },
      { title: 'SLA Tier 对应不同运行点', summary: ['Base、Pro、Max 分别使用不同 batch 与 MTP 参数，以换取吞吐或更低 TPOT。', '相同 engine topology 可以通过运行时 knobs 覆盖多档服务，但容量要分别核算。'], annotation: '产品层的 tier 最终必须落成可验证的 batch/queue/speculation policy，而不只是不同的价格标签。', takeaway: '每个 SLA tier 都应有独立 Pareto 曲线。' },
    ],
    questions: [
      { level: '机制', prompt: 'EP32 比 EP16 多出的主要代价为什么不是权重显存？', hint: '专家权重更分散后，token 要去哪？', answer: '更大 EP group 使 token dispatch/combine 覆盖更多 ranks 和节点，降低本地 NVLink 命中比例，增加网络 A2A、同步长尾和更小的 per-rank token/GEMM。' },
      { level: '推导', prompt: '为什么严格 TPOT tier 往往选择更小 batch？', hint: '单 step 时间与排队/组批等待如何变化？', answer: '更小 batch 减少一次 step 的工作量和组批等待，使单 token 返回更快、更稳定；代价是 GEMM/带宽利用率下降，因此吞吐和 token 成本通常更差。' },
      { level: '设计', prompt: '如果 IB 带宽下降 30%，应先调整哪些 knobs？', hint: '减少跨节点流量或隐藏其延迟。', answer: '先评估缩小 EP、重排 rank 以提高 NVLink locality、降低 batch 或启用更有效 overlap；同时调 P:D 配比和 admission control。选择应以 A2A exposed time 与 SLO goodput 的新 sweep 为依据。' },
    ], related: ['deepseek-v4-pro', 'vllm-wideep-h200'],
  },
  {
    slug: 'blackwell-wideep',
    no: '14', stageNo: '04', stage: '走向生产', source: 'vLLM', date: '2026-02-03',
    title: 'Driving vLLM WideEP and Large-Scale Serving Toward Maturity on Blackwell (Part I)',
    shortTitle: 'Blackwell Wide-EP：低精度与 Prefill Scale-down',
    dek: '从 H200 迁移到 GB200 后，重新优化 FP4 dispatch、kernel fusion、chunking 与 4P1D 资源配比。',
    url: 'https://vllm.ai/blog/2026-02-03-dsr1-gb200-part1', readTime: '约 20 分钟', difficulty: '进阶',
    tags: ['GB200', 'NVFP4', 'Wide-EP', 'Weight Offload', '4P1D'],
    thesis: '新硬件不只让同一拓扑更快；它会改变 P/D 所需 GPU 比例、precision 路径和最值得优化的固定开销。',
    why: '文章展示了硬件代际变化如何反向修改系统设计：Prefill 可以 scale down，Decode 以更少设备获得更大吞吐，但 chunk 与 host-device 路径变得更重要。',
    topology: 'DeepSeek R1/V3 · GB200 · 4 Prefill instances ×2 GPU → 1 Decode ×8 GPU',
    sections: [
      { title: '低精度穿过整条 MoE 路径', summary: ['NVFP4 不只用于 expert GEMM，也用于 dispatch 前的 activation quantization，减少 A2A 字节。', 'MLA projections、O-proj 与多个 elementwise prologue/epilogue 采用专用 FP8/FP4 路径。'], annotation: '如果通信仍传高精度 activation，仅压缩权重计算不会完全释放 Wide-EP；precision policy 应覆盖 compute 和 communication。', takeaway: '量化设计要沿数据流逐段检查 dtype。' },
      { title: 'Kernel Fusion 消除固定开销', summary: ['RoPE、quant、Q write 与 concat K 等小操作被融合，减少 launch 与中间读写。', 'Decode 小 batch 对微秒级同步和 launch 更敏感。'], annotation: '硬件吞吐上升后，原本次要的 launch、output processing 和 chunk bookkeeping 会按比例变大，成为新的 Amdahl ceiling。', takeaway: '升级硬件后必须重新 profile，而不是复用旧瓶颈列表。' },
      { title: 'Prefill Scale-down 与 Weight Offload', summary: ['GB200 的算力让 Prefill 用更少 GPU 仍可供给 Decode，形成 4×2GPU 的 P pool。', '权重 offload 与 chunk 优化帮助小 Prefill 实例在容量限制下运行。'], annotation: 'Scale-down 不是只看单实例 TPS，而是看多个小 P replicas 是否提供更好的排队、弹性和 P:D balance。', takeaway: '资源粒度本身也是调度与弹性设计变量。' },
    ],
    questions: [
      { level: '机制', prompt: '为什么把 dispatch activation 量化到 FP4 能帮助 Wide-EP？', hint: 'MoE A2A 传输的主要 payload 是什么？', answer: 'MoE dispatch 在 ranks 间发送 token activations。降低其 dtype 可直接减少网络字节和带宽时间，使通信更容易被计算覆盖，之后在 expert kernel 侧按匹配格式消费。' },
      { level: '推导', prompt: 'GPU 算力翻倍后，为什么 output processing 可能成为瓶颈？', hint: 'Amdahl 定律与未加速固定时间。', answer: '核心 GEMM 时间下降后，CPU scheduling、kernel launch、采样、拷贝和 chunk bookkeeping 等未同比加速的固定开销占比上升，限制端到端加速。' },
      { level: '设计', prompt: '比较一个 8-GPU Prefill 与四个 2-GPU Prefill 的实验应看什么？', hint: '不止峰值 input TPS。', answer: '比较同 GPU 总量下的 TTFT 分布、queue isolation、实例利用率、weight/KV memory、跨实例 routing、故障影响面、扩缩容粒度和对 Decode 的供给稳定性，并覆盖不同到达率与 prompt 长度。' },
    ], related: ['vllm-wideep-h200', 'gb300-long-context'],
  },
  {
    slug: 'elastic-ep-vllm',
    no: '15', stageNo: '04', stage: '走向生产', source: 'vLLM', date: '2026-05-14',
    title: 'Elastic Expert Parallelism in vLLM',
    shortTitle: 'Elastic EP：运行中改变并行拓扑',
    dek: '不停服增减 DP workers、重建 EP group、迁移专家，并与 EPLB 和 NIXL EP 协调。',
    url: 'https://vllm.ai/blog/2026-05-14-elastic-expert-parallelism', readTime: '约 22 分钟', difficulty: '高阶',
    tags: ['Elastic EP', 'Scale Up/Down', 'Expert Remap', 'Fault Tolerance', 'NIXL EP'],
    thesis: '当 EP group 同时是性能域和故障域时，生产系统必须把拓扑本身从静态启动参数升级为可事务化变更的运行时状态。',
    why: '文章详细给出 scale-up/down 的阶段、standby groups、权重传输、切换点与 EPLB reshuffle，是研究分布式 serving reconfiguration 的一手材料。',
    topology: 'DP workers resize · shared EP group changes · online expert redistribution',
    sections: [
      { title: '哪些状态必须一起改变', summary: ['增减 DP workers 会改变 EP group size、rank membership、expert placement 和 scheduler 可见容量。', '通信组、模型权重与请求路由若不同步切换，会出现 deadlock 或错误 expert ownership。'], annotation: 'Elasticity 不是“多启动一个进程”，而是跨控制面、执行面与通信面的分布式 schema migration。', takeaway: '先列出所有依赖 world size 的状态。' },
      { title: 'Standby Group 与切换点', summary: ['新 workers 先初始化并加入备用通信结构，完成专家映射与权重传输。', '所有 ranks 在受控边界完成 switch，再触发 EPLB 根据新拓扑重排。'], annotation: '真正困难的是定义线性化点：切换前后的请求必须分别只看到一种完整拓扑，不能处于半更新状态。', takeaway: '在线重配置需要版本化 topology epoch。' },
      { title: '从弹性走向容错', summary: ['相同重配置路径可用于移除失败 rank、恢复容量并重新分布专家。', 'NIXL EP 的通信模型有助于减少重新初始化，并提供失败检测能力。'], annotation: '弹性与容错共享机制，但触发条件不同：计划扩缩容可以等待安全点，非计划故障需要处理不完整 collective 与未知状态。', takeaway: '不要把可缩容直接等同于已容错。' },
    ],
    questions: [
      { level: '机制', prompt: '为什么 resize DP 会改变 EP group？', hint: 'vLLM 中 experts 跨哪些 workers 共享？', answer: 'DP Attention workers 各自处理请求，但其 MoE layers 共同组成 EP group；增加或移除 DP worker 就会改变参与专家分片与 token dispatch 的 ranks，因此 expert placement 和通信域都要更新。' },
      { level: '推导', prompt: '为什么必须在 switch 后再次执行 EPLB reshuffle？', hint: '旧映射针对旧 ranks 和旧容量。', answer: 'world size 与设备集合改变后，旧 logical-to-physical expert mapping 可能不均衡或指向已删除 ranks；即使基本权重已分发，也要按新拓扑和近期负载重新优化冗余与放置。' },
      { level: '设计', prompt: '怎样定义一次安全的 scale-down 事务？', hint: '考虑停止新流量、排空、权重保障、切换和回滚。', answer: '标记 topology epoch，停止向待移除 ranks 分配新请求；排空或迁移其请求，确保 surviving ranks 已持有所需专家；建立新通信组并 barrier，在统一 linearization point 切换路由/映射，验证健康后释放旧组，失败则回滚 epoch。' },
    ], related: ['vllm-wideep-h200', 'pd-multiplexing'],
  },
  {
    slug: 'pd-multiplexing',
    no: '16', stageNo: '04', stage: '走向生产', source: 'LMSYS', date: '2025-09-28',
    title: 'PD-Multiplexing: Unlocking High-Goodput LLM Serving with GreenContext',
    shortTitle: 'PD-Multiplexing：不搬 KV 的另一条路',
    dek: '用 GPU 内空间复用隔离 Prefill 与 Decode，在共享 KV pool 的同时动态分配 SM。',
    url: 'https://www.lmsys.org/blog/2025-09-28-pdmux/', readTime: '约 20 分钟', difficulty: '高阶',
    tags: ['PD Multiplexing', 'GreenContext', 'SM Partition', 'SLO Dispatcher', 'Goodput'],
    thesis: 'P/D 的本质是隔离两种执行节奏，不一定要求物理分离；如果 GPU 能提供细粒度空间隔离，就可能保留共享状态并避免 KV migration。',
    why: '它提供了经典 P/D disaggregation 的重要反例，迫使读者区分“资源隔离”“独立扩缩容”和“状态搬运”三件常被捆绑的事。',
    topology: 'single instance · shared KV pool · GreenContext SM partition · SLO-aware dispatcher',
    sections: [
      { title: '为什么重新考虑物理分离', summary: ['跨实例 PD 需要搬运 KV，并可能因固定 P:D 划分产生资源碎片。', '在同一实例内共享 KV pool，可消除 handoff 数据面。'], annotation: '共享状态减少了搬运，但也重新引入同机故障域和容量耦合；它解决的是一组代价，同时放弃另一组自由度。', takeaway: '先拆解 PD 的各项收益，不要把它们视为不可分割套餐。' },
      { title: 'GreenContext 的空间复用', summary: ['为不同 CUDA streams 分配独立 SM 集合，让 Prefill 与 Decode kernels 并发执行。', 'SM 配比可随 workload 和 SLO 调整，使空闲资源在 P/D 间流动。'], annotation: '空间分区要面对 kernel scaling 非线性：某些 kernel 在少量 SM 下效率骤降，静态百分比分配不能代表真实吞吐。', takeaway: '需要 profile 每类 kernel 的 SM sensitivity curve。' },
      { title: 'Bubble-less Engine 与 SLO Dispatcher', summary: ['单线程调度器协调异步 P/D streams，避免 Python 控制路径本身产生竞争。', 'dispatcher 根据 profiling 生成满足 ITL 约束的 multiplex plan。'], annotation: '这里把系统问题转化为资源分配控制问题：核心输入是 workload 预测和 kernel profile，输出是可执行的 SM/调度计划。', takeaway: 'SLO-aware scheduling 需要在线反馈来抵抗分布漂移。' },
    ],
    questions: [
      { level: '机制', prompt: 'PD-Multiplexing 保留了 PD 的哪些收益，又放弃了哪些收益？', hint: '区分执行隔离、状态共享、硬件隔离与独立扩缩容。', answer: '它保留 P/D kernel 并发与一定的执行隔离，同时共享 KV、避免迁移并动态借用 SM；但 P/D 仍在同一 GPU/实例和故障域，不能像物理分离那样独立选硬件、扩大节点或完全独立扩缩容。' },
      { level: '推导', prompt: '为什么固定 50/50 SM 分区通常不是好策略？', hint: '流量比例和 kernel 对 SM 的扩展曲线都在变化。', answer: 'P/D 到达率、input/output 长度与 batch 会动态变化，且不同 kernels 对 SM 数的吞吐不是线性关系。固定分区可能让一侧空闲、另一侧违约，或把 kernel 放在低效率区间。' },
      { level: '设计', prompt: '什么时候选择 Multiplexing、Colocated 或物理 PD？', hint: '构造三个 workload 区间。', answer: '低负载/短 prompt 选简单 colocated；单机且有明显干扰、KV 搬运昂贵、流量比例变化快时考虑 multiplexing；规模大、阶段比例长期失衡、需要不同硬件/并行度或严格故障隔离时选物理 PD。最终以 SLO goodput 验证。' },
    ], related: ['single-node-pd-mori', 'elastic-ep-vllm'],
  },
  {
    slug: 'anatomy-of-vllm',
    no: '17', stageNo: '05', stage: '引擎内核与状态系统', source: 'vLLM', date: '2025-09-05',
    title: 'Inside vLLM: Anatomy of a High-Throughput LLM Inference System',
    shortTitle: 'Inside vLLM：把一次 Engine Step 完整走通',
    dek: '从请求入队、token budget 和 KV block 分配一路追到 forward、sampling、多进程执行与线上服务层。',
    url: 'https://vllm.ai/blog/2025-09-05-anatomy-of-vllm', readTime: '约 41 分钟', difficulty: '入门',
    tags: ['Scheduler', 'PagedAttention', 'Continuous Batching', 'Chunked Prefill', 'Engine Core'],
    thesis: '高吞吐推理引擎的核心不是某一个 kernel，而是 scheduler、KV cache manager 和 model executor 在每个 step 上共同维护的一组状态不变量。',
    why: '这篇文章把 vLLM V1 从离线单卡 Engine Core 逐步扩展到异步、多 GPU、多节点 serving，是建立运行时全局心智模型最完整的入口。',
    topology: 'request processor → Engine Core → scheduler / KV manager → model executor → serving layer',
    sections: [
      { title: '一次请求如何穿过 Engine Core', summary: ['原始输入先经过校验、tokenization 与预处理，变成 EngineCoreRequest 并进入 waiting queue。', '引擎循环反复执行 schedule、forward、postprocess；请求完成后释放 KV blocks，并把 token 流交给输出处理层。'], annotation: '把引擎理解为“每一步都重新形成动态 batch 的状态机”比把它理解为普通模型 forward 更准确。请求可在 waiting、running、preempted 和 finished 状态之间移动。', takeaway: '调度器决定谁参与下一步，执行器只负责把该决策变成 GPU 工作。' },
      { title: 'Token Budget 与 KV Block 分配', summary: ['V1 scheduler 优先推进 running 中的 decode，再用剩余 token budget 接纳 waiting 中的 prefill。', 'allocate_slots 按 block 粒度检查容量、分配物理 KV pages；显存不足时可能触发 recompute preemption。'], annotation: 'token budget 同时约束计算规模与 KV 增量。它把不同长度、不同阶段的请求压缩成同一个调度货币，但并不意味着每种 token 的执行成本完全相同。', takeaway: '分析调度策略时要同时追踪 token budget、block availability 与请求优先级。' },
      { title: '从逻辑 Batch 到 GPU Forward', summary: ['不同请求的 token 被扁平拼接成 super-sequence，positions、slot mapping 和 attention metadata 保证请求之间不会互相注意。', '模型可走 eager 或预捕获 CUDA Graph；chunked prefill 控制长 prompt 独占，prefix caching 通过 block hash 复用完整前缀块。'], annotation: 'continuous batching 不依赖右侧 padding，而依赖运行时元数据把逻辑序列映射到 paged KV。CUDA Graph 又要求 shape 稳定，因此真实引擎一直在动态调度与静态执行模板之间折中。', takeaway: 'PagedAttention 是物理存储机制，continuous batching 是调度机制，两者通过 block table 接合。' },
      { title: '从单进程扩展到在线集群', summary: ['MultiProcExecutor 用进程间消息把同一 execute_model 抽象扩展到 TP/PP workers，Engine Core 无需感知底层执行细节。', '再向外叠加异步 API、DP coordination、负载均衡和压测调优，才形成完整在线服务。'], annotation: '执行面抽象的价值在于隔离拓扑复杂度，但性能问题仍会穿透抽象：IPC、跨 rank 同步、queueing 和网络服务层都可能进入尾延迟。', takeaway: '单 kernel benchmark、engine benchmark 与 online serving benchmark 回答的是三类不同问题。' },
    ],
    questions: [
      { level: '机制', prompt: '为什么 continuous batching 可以不使用 right padding？', hint: '观察 token 的物理拼接方式，以及哪些元数据恢复了序列边界。', answer: '引擎把各请求本步需要计算的 token 扁平拼成连续输入，使用 position、cu_seqlens/attention metadata 和 slot mapping 标记逻辑边界；PagedAttention 再通过 block table 定位每个请求自己的历史 KV，因此无须把所有请求补齐到相同长度。' },
      { level: '推导', prompt: '为什么只设置 max_num_seqs 不能防止一个长 Prefill 垄断 engine step？', hint: '请求数相同不代表本步 token 数相同。', answer: 'max_num_seqs 只限制序列数量，一个长 prompt 仍可能贡献数万 token，耗尽本步计算和 KV 增量预算。还需要 max_num_batched_tokens、long prefill threshold 或 chunked prefill，把单请求工作切到多个 step。' },
      { level: '设计', prompt: '如何判断系统瓶颈在 scheduler、model executor 还是 API serving layer？', hint: '为同一 workload 设计逐层基线，并记录时间线。', answer: '先跑 kernel/forward microbenchmark，再跑无网络的 Engine Core，最后跑完整在线服务；比较 GPU active time、CPU schedule/input-prep、IPC、queue time 与请求序列化开销。保持模型、长度分布和并发一致，逐层加入组件即可定位新增的 exposed latency。' },
    ], related: ['radixattention-sglang', 'single-node-pd-mori'],
  },
  {
    slug: 'radixattention-sglang',
    no: '18', stageNo: '05', stage: '引擎内核与状态系统', source: 'LMSYS', date: '2024-01-17',
    title: 'Fast and Expressive LLM Inference with RadixAttention and SGLang',
    shortTitle: 'RadixAttention：让调度器理解共享前缀',
    dek: '把聊天、few-shot、self-consistency 和树搜索中的 KV 复用统一成 radix tree 上的匹配、插入、分裂与淘汰。',
    url: 'https://www.lmsys.org/blog/2024-01-17-sglang/', readTime: '约 18 分钟', difficulty: '入门',
    tags: ['RadixAttention', 'Prefix Cache', 'Cache-aware Scheduling', 'LRU', 'LLM Programs'],
    thesis: 'KV Cache 不只是单请求私有状态；一旦调度器用 token prefix 建立全局索引，复杂 LLM 程序中的跨调用复用就能自动发生。',
    why: '这篇奠基文章第一次把多种前缀复用模式统一进运行时，并展示前端程序结构与后端缓存调度联合设计的价值。',
    topology: 'full prompt → radix-tree prefix match → paged GPU KV → cache-aware scheduler → leaf LRU eviction',
    sections: [
      { title: '复杂 LLM 程序暴露了哪些复用', summary: ['多轮聊天共享历史，few-shot batch 共享示例，self-consistency 共享问题，tree-of-thought 的分支共享搜索路径。', '传统系统往往只覆盖其中一种模式，或要求用户手工声明缓存边界。'], annotation: '这些 workload 的共同结构是“多个调用的 token 序列拥有最长公共前缀”。因此复用问题可以脱离上层业务语义，转化为运行时的前缀索引问题。', takeaway: '先寻找请求之间的 prefix DAG，再估算缓存价值。' },
      { title: 'Radix Tree 如何映射 KV', summary: ['radix tree 的边可以承载一段 token 序列，value 指向对应的 paged GPU KV tensors。', '新请求执行最长前缀匹配；完成后的 prompt 与生成结果继续插入树中，必要时拆分边以暴露新的共享节点。'], annotation: '树结构保存在 CPU，真正的大对象仍在 GPU page pool。radix tree 是逻辑命名与引用结构，而不是另一份 KV 数据副本。', takeaway: 'token 序列是 key，GPU KV pages 是 value，引用关系决定能否安全复用。' },
      { title: '容量不足时如何淘汰与调度', summary: ['GPU 容量有限，系统以 LRU 方式递归淘汰叶节点，避免破坏仍被后代共享的前缀。', 'cache-aware scheduling 会优先安排具有更多可复用前缀的请求，提高命中率并减少重复 Prefill。'], annotation: '调度目标从最短队列变成“计算成本、等待时间与缓存局部性”的多目标权衡。过度追求 locality 也可能让冷请求饥饿或制造热点。', takeaway: '缓存策略必须和请求选择策略一起评估。' },
      { title: '语言与运行时的联合设计', summary: ['SGLang 前端表达 fork、gen、控制流和并行调用，后端从完整 prompt 中自动恢复复用关系。', '程序还可以被 trace 成 dataflow graph，为 batching、代码移动和自动调优留下空间。'], annotation: '前端并不需要暴露物理 KV 指针；它提供稳定的程序语义，运行时负责把逻辑依赖编译成缓存与调度动作。', takeaway: '好的 serving API 应暴露复用机会，同时隐藏内存所有权细节。' },
    ],
    questions: [
      { level: '机制', prompt: '为什么 RadixAttention 要淘汰叶节点，而不能任意删除内部节点？', hint: '内部节点可能是谁的共享前缀？', answer: '内部节点的 KV 仍被一个或多个后代请求依赖，直接删除会破坏这些缓存路径。叶节点没有被更长缓存继续引用，按 LRU 递归删除叶子可以在保持树前缀闭包的同时回收空间。' },
      { level: '推导', prompt: '缓存命中率高，为什么 TTFT 仍可能变差？', hint: '考虑等待队列与数据所在设备。', answer: 'cache-aware 调度若为了命中延后其他请求，queue time 可能抵消省下的 prefill；若命中数据已被卸载或需要搬运，I/O 也可能超过重算成本。因此应比较端到端 TTFT，而非只看逻辑 hit rate。' },
      { level: '设计', prompt: '为多租户 Agent 服务设计一种比纯 LRU 更稳健的淘汰策略。', hint: '同时考虑复用价值、重算成本、公平性和安全域。', answer: '可按 tenant/security domain 隔离索引，以最近访问、命中次数、prefix 长度/重算 FLOPs、存储字节和请求到达预测计算价值分数，并为各租户设容量配额；淘汰仅从无活跃引用的叶节点中选择，同时保留等待时间上限防止 locality 调度造成饥饿。' },
    ], related: ['anatomy-of-vllm', 'sglang-hicache'],
  },
  {
    slug: 'sglang-hicache',
    no: '19', stageNo: '05', stage: '引擎内核与状态系统', source: 'LMSYS', date: '2025-09-10',
    title: 'SGLang HiCache: Fast Hierarchical KV Caching with Your Favorite Storage Backends',
    shortTitle: 'HiCache：把 Radix Tree 扩展成分层 KV 页表',
    dek: '让 GPU、CPU 与远端存储组成一个可调度的 KV hierarchy，并为不同层分别优化布局、搬运与写回策略。',
    url: 'https://www.lmsys.org/blog/2025-09-10-sglang-hicache/', readTime: '约 16 分钟', difficulty: '进阶',
    tags: ['HiCache', 'Hierarchical KV', 'HiRadixTree', 'Prefetch', 'Storage Backend'],
    thesis: '分层 KV Cache 的关键不是简单增加容量，而是让命名、放置、I/O 布局和请求调度共同决定一次命中是否比重算更便宜。',
    why: '文章从 GPU-only RadixAttention 的容量上限出发，完整讨论了 CPU/存储层的数据面和控制面，是理解外部 KV 系统的最佳过渡材料。',
    topology: 'HiRadixTree page table · GPU layer-first pool · CPU/storage page-first pools · async cache controller',
    sections: [
      { title: 'GPU-only Prefix Cache 的容量悬崖', summary: ['长上下文和多轮会话会迅速占满 GPU KV pool，历史前缀被淘汰后仍需重复 Prefill。', 'HiRadixTree 作为页表记录 KV 当前位于 GPU、CPU 或外部存储，由 cache controller 管理层级间加载与备份。'], annotation: '扩大缓存层级改变了“free block”的语义：GPU eviction 不再等于数据失效，而可能只是 residency 变化。调度器需要区分 miss、remote hit 和 in-flight。', takeaway: '缓存命中必须带上 location 与 readiness 才对调度有意义。' },
      { title: '计算布局与 I/O 布局为什么分离', summary: ['GPU KV pool 保持 layer-first，以兼容 attention kernels 的逐层访问。', 'CPU 与存储层使用 page-first，把同一 page 的多层数据连续放置，从而形成更大的传输事务，并配合 zero-copy 和 GPU-assisted I/O。'], annotation: '最佳计算布局未必是最佳传输布局。分层系统常需要在边界完成 layout-aware gather/scatter；如果转换成本未被统计，理论带宽收益会失真。', takeaway: '数据布局是 kernel contract，也是 I/O contract。' },
      { title: '如何把搬运隐藏在计算后面', summary: ['CPU hit 可按 layer 流水加载：第 N 层计算时预取后续层 KV，让传输与 forward 重叠。', '外部存储延迟更高且波动更大，可选择 best-effort、超时取消或等待完成等 prefetch 行为。'], annotation: '是否等待远端 cache hit 本质上是“剩余搬运时间 vs 重算时间 vs queueing 影响”的在线决策，静态 hit/miss 策略很难在所有负载下最优。', takeaway: '优化目标是 exposed load latency，而不是后台 I/O 吞吐。' },
      { title: '写策略与可插拔后端', summary: ['write-through、selective write-through 与 write-back 在复用率、带宽和数据持久时间之间取舍。', '存储后端只需实现 get、exist、set，调度与同步由中心 controller 统一处理，已能连接 Mooncake、3FS、NIXL 等路径。'], annotation: '简洁接口提升可替换性，但并不会消除语义差异：一致性、失败恢复、对象粒度、带宽和尾延迟仍要由上层策略显式吸收。', takeaway: '控制面接口越统一，性能与一致性契约越要写清楚。' },
    ],
    questions: [
      { level: '机制', prompt: '为什么 GPU 使用 layer-first，而 CPU/存储偏向 page-first？', hint: '分别沿 attention 计算和一次远端读取的访问方向观察。', answer: 'attention 按层执行，需要快速访问该层所有活跃 pages，因此 GPU 保持 layer-first；外部命中通常要恢复一个 token page 在所有层的 KV，page-first 可把数据组成更大的连续 I/O，减少小事务和描述符开销。' },
      { level: '推导', prompt: '远端命中已经确认时，为什么仍可能选择取消 prefetch 并重算？', hint: '命中不等于及时可用。', answer: '如果远端尾延迟、排队或剩余数据量使完成时间超过本地重算，而且等待会阻塞当前 batch 的 TTFT，那么 remote hit 的经济价值为负。调度器应比较预计完成时间和重算成本，而不是无条件等待命中。' },
      { level: '设计', prompt: '如何评估 write-through、selective 与 write-back 三种策略？', hint: '构造不同复用率和带宽压力的 workload。', answer: '按 prefix 复用间隔、会话长度、后端带宽和容量分桶，记录写流量、读命中、淘汰前复用次数、TTFT 与重算 FLOPs；write-through 适合高复用且写带宽充足，selective 适合热点明显，write-back 适合慢层容量或带宽紧张但需承担 eviction/故障前未落盘风险。' },
    ], related: ['radixattention-sglang', 'vllm-mooncake-agentic'],
  },
  {
    slug: 'vllm-mooncake-agentic',
    no: '20', stageNo: '05', stage: '引擎内核与状态系统', source: 'vLLM', date: '2026-05-06',
    title: 'Serving Agentic Workloads at Scale with vLLM x Mooncake',
    shortTitle: 'Mooncake：Agent 流量需要集群级 KV Pool',
    dek: '从长会话、跨实例 miss 出发，构建带全局元数据、GPUDirect RDMA 与 MultiConnector 的分布式 KV Cache。',
    url: 'https://vllm.ai/blog/2026-05-06-mooncake-store', readTime: '约 10 分钟', difficulty: '进阶',
    tags: ['Agentic Serving', 'Mooncake', 'Distributed KV', 'GPUDirect RDMA', 'MultiConnector'],
    thesis: 'Agent 请求的真实工作集属于整个会话而不是某个 replica；当调度会迁移请求时，KV Cache 必须从本地优化升级为可跨实例发现和读取的集群状态。',
    why: '文章基于真实 coding-agent trace 解释为何本地 offload 和 sticky routing 不足，并展示同一 KVConnector 抽象如何同时支撑分布式缓存与 P/D 分离。',
    topology: 'vLLM workers + Mooncake clients → RDMA DRAM/SSD pool · cluster master metadata · PD MultiConnector',
    sections: [
      { title: 'Agent Workload 为什么改写成本模型', summary: ['多轮 agent 每次只增加少量工具结果和输出，但会反复携带不断增长的完整历史。', '文章分析的 trace 具有极高 prefix 重复率和输入输出比；本地容量有限，跨 replica 调度又会制造 cold miss。'], annotation: '普通聊天常按单次 input/output 长度估成本；agent 更应按 session 的增量 token、轮间间隔和 prefix residency 建模。完整 prompt 很长，不代表每轮必须重新执行同样多的 Prefill。', takeaway: 'Agent serving 的基本调度单位应从 request 扩展到 session state。' },
      { title: '全局元数据与分布式数据面', summary: ['Mooncake master 管理 block hash、位置、client health 与失效清理，scheduler 先查询匹配前缀。', '每个 GPU worker 内嵌 client，管理本地 DRAM/SSD 并通过 RDMA 与其他节点交换 KV blocks。'], annotation: '元数据路径回答“块在哪里且是否有效”，数据路径回答“怎样把块搬到目标 HBM”。两者分开扩展后，也必须处理 stale metadata、节点死亡和并发写入。', takeaway: '分布式缓存首先是 metadata consistency 系统，其次才是高速 copy 系统。' },
      { title: '为什么强调 SM-free 与 Fully Async', summary: ['注册 GPU KV 内存后，GPUDirect RDMA 可在 HBM 与远端内存之间直接搬运，无需 CPU staging，也不占用 SM copy kernel。', 'RDMA descriptor 准备仍有 CPU 成本，因此所有 I/O 下发放到独立后台线程，避免延迟主线程的 GPU kernel launch。'], annotation: '“RDMA 是异步的”只描述设备操作，不代表调用路径没有 CPU 工作。端到端异步必须把描述符构建、提交、完成通知和错误处理一起移出关键控制路径。', takeaway: '检查异步设计时，沿 CPU launch path 追踪所有可能阻塞点。' },
      { title: 'MultiConnector 如何组合 PD 与历史缓存', summary: ['Prefill 侧既通过 PD connector 把本次 KV 交给 Decode，也通过 store connector 写入集群缓存；历史命中则先从 pool 恢复。', 'Decode 产生的新 KV 可写回 pool；当前设计仍由 Prefill 读取历史缓存后转交 Decode，未来可扩展为多路径并行加载。'], annotation: '两个 connector 解决不同生命周期：PD handoff 服务当前请求，distributed store 服务未来轮次。组合后要避免重复搬运，并明确谁负责 lookup、ownership 与完成条件。', takeaway: '同一份 KV 可以同时位于请求数据流与长期缓存数据流。' },
    ],
    questions: [
      { level: '机制', prompt: '有了 sticky routing，为什么仍需要分布式 KV pool？', hint: '考虑容量、故障、扩缩容和负载均衡。', answer: 'sticky routing 只能提高命中概率，无法保证原实例仍存活、仍有容量或没有排队；扩缩容、故障转移和热点均衡都会迁移会话。分布式 pool 让 KV 与单个 replica 解耦，为跨实例命中和更大的聚合容量提供后备路径。' },
      { level: '推导', prompt: '为什么 GPUDirect RDMA 不占 SM 仍可能影响模型执行？', hint: '共享的不只有 SM。', answer: 'RDMA 会竞争 HBM、PCIe/NVLink、NIC 和内存控制器带宽，也会产生 CPU descriptor 与完成处理；大量小 block 还可能放大元数据和队列开销。因此 SM-free 只消除一种干扰，仍需测 attention/MLP 与传输并发时的带宽争用。' },
      { level: '设计', prompt: '如何联合设计 cache-aware routing 与 distributed lookup？', hint: '优先本地性，但避免热点和无限等待。', answer: 'router 用 session/block locality、worker queue、KV headroom 和健康度打分：优先选择已有本地前缀且未拥塞的 worker；若本地队列代价超过远端 load 或重算代价则迁移。请求携带 cache key/epoch，scheduler 查询全局位置并设置 I/O deadline，同时保留无缓存 fallback。' },
    ], related: ['sglang-hicache', 'single-node-pd-mori'],
  },
  {
    slug: 'dspark-sglang',
    no: '21', stageNo: '05', stage: '引擎内核与状态系统', source: 'LMSYS', date: '2026-07-06',
    title: 'DSpark in SGLang: Speculative Decoding with Confidence-Driven, Variable-Length Verification',
    shortTitle: 'DSpark：把推测长度变成在线调度变量',
    dek: '用置信度为每个请求分配不同 verify window，再通过 ragged CUDA Graph、成本表和 overlap 把算法收益兑现。',
    url: 'https://www.lmsys.org/blog/2026-07-06-dspark-sglang/', readTime: '约 24 分钟', difficulty: '高阶',
    tags: ['Speculative Decoding', 'Ragged Verify', 'CUDA Graph', 'Confidence Scheduler', 'Cost Model'],
    thesis: '推测解码的最优 K 不是模型常数；它随请求可预测性、batch load 和 target verify 的边际成本变化，必须在每一步动态分配。',
    why: '文章真正有价值的部分是 serving 集成：它把 per-request 变长验证塞进完整 CUDA Graph，并用 profile 成本模型与异步调度消除控制路径开销。',
    topology: 'block drafter + confidence head → per-request K → ragged packed verify → target model → accept / reschedule',
    sections: [
      { title: '固定 K 为什么在高负载下失效', summary: ['batch size 为 B、每请求推测 K 个 token 时，target 每步最多要验证约 B×K 个额外位置。', '低 batch 时更宽 verify 可能几乎免费；并发升高、target 吞吐接近平台后，多验证的尾部会延长整个 step。'], annotation: '推测解码减少的是串行 step 数，增加的是单 step 工作量。只有“被接受 token 带来的步数节省”大于“draft、verify 和调度附加成本”时才有净收益。', takeaway: '接受长度必须和 verify step latency 放在同一条收益函数里。' },
      { title: '置信度如何变成 Verify Budget', summary: ['半自回归 block drafter 一次产生一段候选，confidence head 估计各 token 存活概率，STS 校准估计。', 'scheduler 根据每个请求自己的置信度与成本表选择 window；compact 模式只验证选中的长度，static 保留完整 block。'], annotation: '同一 batch 内的请求难度不同，使用统一 K 会把容易请求的机会和困难请求的浪费平均掉。per-request budget 才能利用这种异质性。', takeaway: '调度对象从“请求是否运行”细化为“每个请求本步运行多少 token”。' },
      { title: 'Ragged Verify 如何进入 CUDA Graph', summary: ['不同请求的 window 变长，若全部 pad 到最大 K，就会重新计算刚刚裁掉的 token。', '系统把有效候选 front-pack 成 cu_seqlens 风格的紧凑 buffer，以总 token 数选择最近的 graph tier，因此 trim 后会重放真正更小的 forward。'], annotation: 'CUDA Graph 固定的是捕获后的执行模板，并不要求业务请求完全等长。通过有限 tiers 和设备端 metadata，可以在静态 launch 与动态有效工作量之间建立量化近似。', takeaway: 'Masked fixed-width 与 packed ragged graph 的计算量并不等价。' },
      { title: '成本模型、Overlap 与可观测性', summary: ['离线 profiler 拟合 step time，把随 request 数变化的底座成本与随 verify token 变化的边际成本分开。', 'Spec V2 overlap scheduler 将下一步调度隐藏在当前 forward 后；cap-accept 与 estimator 用于观察被 trimming 遮蔽的接受上限。'], annotation: '动态策略会产生反事实盲区：没有验证的 token 就没有真实 acceptance。必须专门设计对照模式或估计器，否则线上只能看到节省了多少计算，看不到牺牲了多少潜在接受。', takeaway: '自适应优化需要同时观测收益、成本与被策略裁剪掉的机会。' },
    ],
    questions: [
      { level: '机制', prompt: '为什么 compact verify 不能简单 pad 到 batch 内最大 K？', hint: 'DSpark 要节省的是哪部分 target 计算？', answer: 'padding 后 target 仍会为所有填充位置执行 attention 和 MLP，verify token 总量接近 B×max(K)，动态 trimming 的计算收益消失。front-pack ragged tokens 并按总量选择较小 graph tier，才能让低预算请求真正少算。' },
      { level: '推导', prompt: '为什么 batch=1 时动态 trimming 的收益可能很小？', hint: '观察 target verify kernel 在小规模下的利用率曲线。', answer: '小 batch 时 GPU 尚未饱和，多验证几个 token 可能只填充空闲并行度，step latency 增量很小；裁剪虽然减少 FLOPs，却不缩短墙钟时间。高并发进入饱和区后，额外 token 才显著增加边际成本，动态 K 的收益随之放大。' },
      { level: '设计', prompt: '如何让 DSpark 的成本模型应对 context length 和流量漂移？', hint: '离线表只是初始先验。', answer: '离线按 batch、verify tokens、context bucket、并行拓扑和 graph tier 建表；线上采样 device timing 与 acceptance/calibration，使用带版本的滑动更新修正残差，并设置稳定区间和 fallback K。模型或硬件配置变化时重新 profile，避免跨配置复用旧表。' },
    ], related: ['anatomy-of-vllm', 'triton-attention-backend'],
  },
  {
    slug: 'triton-attention-backend',
    no: '22', stageNo: '05', stage: '引擎内核与状态系统', source: 'vLLM', date: '2026-03-04',
    title: 'vLLM Triton Attention Backend Deep Dive',
    shortTitle: 'Triton Attention：从 Paged KV 到 Persistent Kernel',
    dek: '围绕 tile、GQA cache reuse、parallel tiled softmax 与 CUDA Graph，拆解一套跨 NVIDIA、AMD、Intel 的 PagedAttention kernel。',
    url: 'https://vllm.ai/blog/2026-03-04-vllm-triton-backend-deep-dive', readTime: '约 10 分钟', difficulty: '高阶',
    tags: ['Triton', 'PagedAttention', 'Persistent Kernel', 'Split-KV', 'Performance Portability'],
    thesis: '性能可移植不是写一个朴素通用 kernel，而是把可变 workload 映射成可调 tile、有限执行策略和设备端动态 work assignment。',
    why: '文章把 attention backend 抽象、微基准方法和 CUDA Graph 约束连到一个具体 kernel，是理解“框架怎样承载多硬件高性能算子”的优秀案例。',
    topology: 'vLLM attention backend API → Triton paged attention → autotuned Q blocks / 3D split → persistent launch',
    sections: [
      { title: '为什么需要 Attention Backend 抽象', summary: ['vLLM 需要支持不同加速器、模型特性、dtype 和 attention pattern，维护大量手写专用 kernel 很难持续扩展。', '统一 backend API 把 attention 实现与模型其他层解耦；Triton backend 只依赖 PyTorch/Triton，并作为多平台默认或 fallback 路径。'], annotation: '抽象层不是为了让所有 kernel 完全相同，而是固定输入输出、KV layout 和 metadata contract，让后端可以独立选择最适合硬件与 workload 的实现。', takeaway: '可插拔性能后端首先需要稳定的数据与调度契约。' },
      { title: 'Q Block 如何提高矩阵效率', summary: ['KV 侧 tile 受到 page size 约束，因此优化重点转到 query 侧。', 'GQA 中多个 query heads 共享一个 KV head；把它们和多个 query tokens 合入 Q block，可提高 tl.dot tile 规模与 KV cache reuse。'], annotation: 'tile 过小浪费 Tensor Core，过大则增加寄存器/共享内存压力并降低 occupancy。最佳 Q block 随 prefill/decode shape、head size 和硬件变化，所以需要 autotuning 而非单一常数。', takeaway: 'kernel tuning 的核心是把算法维度重排成硬件喜欢的工作块。' },
      { title: 'Decode 为什么需要 Parallel Tiled Softmax', summary: ['Prefill 有多个 query token 可提供并行度，decode 每请求通常只有一个新 query，Q-block 路径不再有同样收益。', '3D kernel 将长 KV 遍历切给多个 program，各自计算 partial softmax/output，再由第二个 kernel 规约。'], annotation: 'split-KV 增加并行度，也增加 partial buffer、二次 launch 和 reduction。只有长 context 或并行度不足时，缩短主遍历的收益才会超过额外开销。', takeaway: '并行化 attention 会把串行遍历换成额外规约，不存在无条件收益。' },
      { title: 'CUDA Graph 为什么推动 Persistent Kernel', summary: ['传统 launch grid 随 batch 和 sequence length 变化；捕获较大 grid 后，小 workload 重放仍会执行多余 waves。', 'persistent kernel 固定启动与可用资源匹配的 programs，每个 program 从 GPU metadata 动态领取工作，使 graph shape 固定而有效工作量可变。'], annotation: 'persistent 并不意味着 kernel 永久在线；关键是一次 launch 的 worker 数固定，任务分配转移到设备端。它用轻量调度开销换取稳定 grid、负载均衡与 graph 复用。', takeaway: '当 host launch 必须静态化时，把动态性下沉到 device work queue。' },
    ],
    questions: [
      { level: '机制', prompt: '为什么 GQA 适合把同一 KV head 对应的 query heads 放进一个 Q block？', hint: '哪些数据可以在 program 内复用？', answer: '这些 query heads 读取同一组 K/V pages。合并处理可让 KV tile 在寄存器或 cache 中被多个 query heads 重用，同时扩大 tl.dot 的矩阵维度，提高 Tensor Core 利用率并减少重复加载。' },
      { level: '推导', prompt: '何时 parallel tiled softmax 会比单 kernel 更慢？', hint: '列出被新增的内存与 launch 工作。', answer: '在 context 较短、batch/head 已提供足够并行度或 launch overhead 占比较高时，拆分带来的 partial score/output 写回、第二次 kernel launch和 reduction 成本会超过缩短 KV 遍历的收益；因此需由 shape-aware heuristic 选择。' },
      { level: '设计', prompt: '如何证明一个 Triton backend 真正实现了 performance portability？', hint: '不要只在一张卡、一个 shape 上比较峰值。', answer: '在 NVIDIA、AMD、Intel 的代表硬件上覆盖 prefill、mixed、decode，扫 batch、context、head size、dtype 和 page size；分别做 microbenchmark 与端到端 serving，比较各平台最强可用 backend 的 Pareto 曲线，并统计需要维护的特化代码与 autotune 成本。' },
    ], related: ['anatomy-of-vllm', 'dspark-sglang'],
  },
];

export const stages = [
  { no: '01', title: '建立坐标系', caption: '先理解模型结构如何改变 TP、PP、DP 与 EP 的收益。' },
  { no: '02', title: '拆开 P 与 D', caption: '沿请求流追踪 KV、调度、通信与独立扩缩容。' },
  { no: '03', title: '进入前沿架构', caption: '处理 Hybrid Attention、超长上下文与极稀疏 MoE。' },
  { no: '04', title: '走向生产', caption: '用 SLA、弹性、故障域和 goodput 收束设计。' },
  { no: '05', title: '深入引擎内核', caption: '把调度、KV 层级、推测解码与 Attention kernel 连成完整运行时。' },
];

export function getArticle(slug: string) {
  return articles.find((article) => article.slug === slug);
}
