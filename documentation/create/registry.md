---
title: レジストリ
description: データを保持するためのAPI
---

# レジストリ

データを保持するためのAPI

## 定義

```typescript
const CONFIG_REGISTRY = RegistryType.createJson(APP_ID, {
    name: 'config',
});

const config = omu.registries.get(CONFIG_REGISTRY);
```
