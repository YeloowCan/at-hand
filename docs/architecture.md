# 随取 AtHand - 架构文档

## 技术架构

### 核心技术栈

| 分类 | 技术 | 用途 |
|------|------|------|
| 框架 | Expo SDK 52 | 跨平台移动应用开发框架 |
| 语言 | TypeScript | 类型安全的JavaScript超集 |
| 路由 | Expo Router | 基于文件系统的路由方案 |
| 状态管理 | Zustand | 轻量级状态管理库 |
| 样式 | NativeWind | Tailwind CSS的React Native实现 |
| 数据库 | SQLite (expo-sqlite) | 本地SQLite数据库 |
| 加密 | expo-crypto | 数据加密处理 |

### 项目结构

```
at-hand/
├── app/                    # Expo Router 页面目录
│   ├── (tabs)/            # Tab 导航组
│   │   ├── _layout.tsx    # Tab 布局
│   │   ├── index.tsx      # 首页（最近使用）
│   │   └── explore.tsx    # 探索/分类页
│   ├── _layout.tsx        # 根布局
│   └── modal.tsx          # 模态框页面
├── components/           # React 组件
│   └── ui/                # UI 基础组件
├── constants/            # 常量定义
│   └── theme.ts          # 主题配置
├── hooks/                # 自定义 Hooks
├── store/                # Zustand 状态存储（待创建）
├── db/                   # 数据库相关（待创建）
└── docs/                 # 项目文档
```

### 核心模块设计

#### 1. 页面路由 (app/)

- `/` - 首页：展示最近使用的信息列表
- `/explore` - 分类浏览页
- `/modal` - 新增/编辑信息的模态框

#### 2. 状态管理 (store/)

采用 Zustand 进行状态管理，主要包含：
- `useInfoStore` - 信息数据管理（CRUD操作）
- `useAppStore` - 应用级状态（搜索关键词、筛选条件等）

#### 3. 数据层 (db/)

使用 SQLite 本地存储：
- `info` 表：存储信息条目（标题、内容、分类、创建时间等）
- 支持增删改查和模糊搜索

#### 4. 安全机制

- 数据加密存储
- PIN码或生物识别解锁

### 状态说明

- ✅ 已完成
- 🔄 进行中
- ⏳ 待开始
