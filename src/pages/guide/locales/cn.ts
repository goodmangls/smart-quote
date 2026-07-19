export const cn = {
  pageTitle: '使用指南',
  tocTitle: '目录',
  adminBadge: '管理员',
  memberBadge: '会员',
  tipLabel: '提示',
  noteLabel: '注意',
  shortcutLabel: '快捷键',
  screenshotPlaceholder: '[截图: %s]',
  sections: {
    gettingStarted: {
      title: '入门指南',
      items: [
        {
          title: '创建账户',
          description:
            '点击右上角的"注册"。填写邮箱、密码、公司名称、姓名，并选择国籍（必填）。注册后账户将立即激活。',
        },
        {
          title: '登录',
          description: '点击"登录"，输入注册邮箱和密码。系统会在会话间记住您的语言和主题偏好。',
        },
        {
          title: '语言和主题',
          description:
            '使用地球图标在英语、韩语、日语和中文之间切换。使用月亮/太阳图标切换暗黑模式。这些设置会自动保存。',
        },
      ],
    },
    dashboard: {
      title: '仪表盘',
      items: [
        {
          title: '欢迎横幅',
          description: '显示您的姓名、角色和创建新报价的快捷按钮。',
        },
        {
          title: '最近报价',
          description:
            '一目了然地显示最近保存的报价的路线、承运商和总价。点击"查看全部"可访问完整的报价历史。',
        },
        {
          title: '天气插件',
          description: '提供全球47个主要港口和机场的实时天气状况。天气异常可能影响运输时间表。',
          adminOnly: true,
        },
        {
          title: '汇率插件',
          description: 'USD、EUR、JPY、CNY、GBP、SGD兑KRW的实时汇率。每5分钟自动刷新。',
          adminOnly: true,
        },
        {
          title: '汇率计算器',
          description: '侧边栏的快速货币转换工具。选择货币并输入金额即可转换。',
          adminOnly: true,
        },
      ],
    },
    quoteCalculator: {
      title: '报价计算器',
      items: [
        {
          title: '① 路线与交货条件',
          description:
            '选择始发国、目的国、运输区域和交货模式（门到门或门到机场）。输入目的地邮编以获取准确报价。',
        },
        {
          title: '② 货物详情',
          description:
            '输入箱数、尺寸（长 x 宽 x 高，厘米）和实际重量（公斤）。系统自动计算体积重量并应用包装调整值（+10/+10/+15厘米）。',
        },
        {
          title: '③ 附加服务',
          description:
            '设置首尔取货费用，查看系统自动应用的附加费（AHS、大件等），如需可手动添加附加费。DHL新增6项附加服务：EMG、TSD、NSC、MWB、LBI、LBM。',
        },
        {
          title: '特殊包装信息',
          description:
            '选择WOODEN_BOX、SKID或VACUUM包装时显示详细费用面板：材料费（表面积 × ₩15,000/m²）、人工费（₩50,000/箱，真空₩75,000）、熏蒸费（₩30,000固定）、尺寸/重量影响。还会显示AHS自动检测警告。',
          adminOnly: true,
        },
        {
          title: 'UPS Surge Fee & EAS/RAS',
          description:
            '中东/以色列目的地会自动计算UPS Surge Fee（SGF）。输入邮编时，系统自动检查86个国家39,876个邮编范围，检测偏远/扩展区域附加费并支持一键应用。',
        },
        {
          title: '④ 财务设置',
          description:
            '查看应用的汇率和FSC百分比。系统使用实时汇率，但允许管理员手动覆盖。快递（UPS/DHL）仅适用DAP贸易术语。',
          adminOnly: true,
        },
        {
          title: '结果与比较',
          description:
            '查看UPS、DHL费率的并排比较卡片。每张卡片显示始发费用、运费、目的地费用和最终价格明细。',
        },
      ],
    },
    savingQuotes: {
      title: '保存报价',
      items: [
        {
          title: '保存按钮',
          description:
            '计算完成后点击"保存报价"。系统会生成唯一的参考编号（SQ-YYYY-NNNN）用于跟踪。',
        },
        {
          title: '添加备注',
          description: '保存时可添加内部备注或客户特定说明。这些备注在报价详情视图中可见。',
        },
        {
          title: 'Slack通知',
          description:
            '会员保存报价时，系统会自动向团队频道发送Slack通知。这有助于管理员实时跟踪会员活动。',
        },
        {
          title: '报价有效期',
          description:
            '保存的报价有有效期限，以颜色标识：绿色（>3天）、黄色（1-3天）、红色（已过期）。附加费变更也可能标记报价需要重新验证。',
        },
      ],
    },
    pdfExport: {
      title: 'PDF导出',
      items: [
        {
          title: '生成PDF',
          description:
            '在已保存的报价上点击"下载PDF"可生成专业报价文档。PDF包括路线详情、费用明细、韩英双语免责声明和费率日期。',
        },
        {
          title: 'PDF内容',
          description:
            '生成的PDF包含：公司抬头、参考编号、始发地/目的地、逐项费用明细、包装类型及费用细分（材料费、人工费、熏蒸费）、承运商附加服务明细（SGF、EXT、RMT等）、应用利润率、KRW和USD最终价格及有效期免责声明。',
        },
      ],
    },
    quoteHistory: {
      title: '报价历史',
      items: [
        {
          title: '搜索报价',
          description: '使用搜索栏按参考编号、目的国或备注查找报价。搜索功能适用于所有文本字段。',
        },
        {
          title: '筛选',
          description:
            '按目的国、日期范围或状态（已确认/已过期）筛选报价。将搜索与筛选结合可获得精确结果。',
        },
        {
          title: '报价详情',
          description:
            '点击任何报价行打开详情弹窗。查看完整费用明细、应用的利润规则、备注和附加费状态。',
        },
        {
          title: 'CSV导出',
          description:
            '将报价历史导出为CSV文件供外部分析。导出包含所有可见列，最多支持10,000条记录。',
        },
      ],
    },
    accountSettings: {
      title: '账户设置',
      items: [
        {
          title: '修改密码',
          description:
            '点击页眉的齿轮图标打开账户设置。输入当前密码，然后输入新密码（至少6个字符）并确认。',
        },
        {
          title: '主题偏好',
          description: '使用页眉的太阳/月亮图标在浅色和深色模式之间切换。您的偏好保存在浏览器中。',
        },
        {
          title: '语言偏好',
          description:
            '点击地球图标切换语言。系统支持英语、韩语、日语和中文。您的选择会在会话间保持。',
        },
      ],
    },
    adminOverview: {
      title: '管理面板概览',
      items: [
        {
          title: '访问管理面板',
          description:
            '管理员用户会在页眉看到"管理面板"链接。管理视图提供相同的报价计算器，以及下方的额外管理插件。',
        },
        {
          title: '管理插件',
          description:
            '管理面板包含：利润规则、FSC费率、附加费管理、客户管理、用户管理、费率表查看器和审计日志。',
        },
        {
          title: '利润可见性',
          description:
            '只有管理员可以在报价结果中看到利润明细和定价策略部分。会员只能看到最终价格。',
        },
      ],
    },
    marginRules: {
      title: '利润规则管理',
      items: [
        {
          title: '优先级系统',
          description:
            '利润规则按优先级解析：P100（每用户固定费率，最高优先级）> P90（每用户基于重量）> P50（基于国籍）> P0（默认值）。第一个匹配的规则生效。',
        },
        {
          title: '创建规则',
          description:
            '点击"添加规则"创建新的利润规则。指定优先级等级、目标（用户邮箱或国籍）、利润百分比，以及P90规则的可选重量范围。',
        },
        {
          title: '编辑与删除',
          description:
            '点击编辑图标可内联修改现有规则。删除使用软删除以保留审计历史。所有变更记录在审计日志中。',
        },
        {
          title: '规则解析',
          description: '使用"测试解析"功能查看特定用户和重量组合适用哪条利润规则。结果缓存5分钟。',
        },
      ],
    },
    fscManagement: {
      title: 'FSC费率管理',
      items: [
        {
          title: '查看当前费率',
          description:
            'FSC插件显示DHL和UPS当前的燃油附加费百分比（国际/国内）。每个费率显示最后更新日期。',
        },
        {
          title: '更新费率',
          description:
            '输入新的FSC百分比并保存。变更立即应用于所有新计算。提供外部验证链接以与官方承运商页面交叉核对。',
        },
        {
          title: '费率影响',
          description: 'FSC作为基础承运商运费的百分比应用。FSC变更直接影响所有报价计算。',
        },
      ],
    },
    surchargeManagement: {
      title: '附加费管理',
      items: [
        {
          title: '当前附加费',
          description:
            '以表格形式查看所有当前有效的附加费。每条记录显示附加费名称、承运商、类型（百分比或固定金额）、金额和有效日期。',
        },
        {
          title: '添加附加费',
          description:
            '使用表单添加承运商特定附加费。指定承运商、附加费名称、类型（百分比或固定金额）、值和可选的起止日期。',
        },
        {
          title: '承运商链接',
          description: '提供UPS和DHL官方附加费公告页面的快速链接供核实。',
        },
        {
          title: '重要通知',
          description:
            '附加费根据承运商官方公告手动更新，不自动同步。请在最终确认报价前务必在官方页面核实。',
        },
      ],
    },
    customerManagement: {
      title: '客户管理',
      items: [
        {
          title: '客户列表',
          description: '查看所有注册客户的公司名称、联系信息和显示活跃度的报价数量徽章。',
        },
        {
          title: '添加客户',
          description:
            '创建包含公司名称、联系人、邮箱和电话号码的客户记录。客户记录可关联到已保存的报价。',
        },
        {
          title: '客户报价',
          description: '查看与特定客户关联的所有报价。有助于跟踪客户活动和定价历史。',
        },
      ],
    },
    userManagement: {
      title: '用户管理',
      items: [
        {
          title: '用户列表',
          description:
            '查看所有注册用户的姓名、邮箱、公司、国籍、网络会员身份和角色（管理员/会员）。',
        },
        {
          title: '编辑用户',
          description:
            '点击"编辑"修改用户详情，包括角色、公司、国籍和网络会员身份。变更立即保存并记录。',
        },
        {
          title: '搜索与筛选',
          description: '使用搜索栏按姓名、邮箱或公司名称查找用户。',
        },
      ],
    },
    rateTableViewer: {
      title: '费率表查看器',
      items: [
        {
          title: '查看费率表',
          description:
            '以只读格式浏览承运商特定费率表（UPS、DHL）。表格显示所有运输区域的基于重量的定价。',
        },
        {
          title: '区域参考',
          description: '每个承运商有自己的区域映射。查看器显示每个区域包含哪些国家，供报价时参考。',
        },
      ],
    },
    auditLog: {
      title: '审计日志',
      items: [
        {
          title: '查看审计日志',
          description:
            '所有管理员操作（利润规则变更、FSC更新、附加费修改、用户编辑）均记录时间戳、用户、操作类型和详情。',
        },
        {
          title: '搜索与筛选',
          description: '按日期范围、操作类型或用户筛选审计日志。使用搜索栏查找特定条目。',
        },
        {
          title: '合规性',
          description: '审计日志提供所有配置变更的完整记录，用于合规和问责目的。',
        },
      ],
    },
  },
};
