# 앱 버전 업데이트

앱 버전을 업데이트하고, 선택적으로 강제 업데이트를 설정합니다.

## Usage

```
/update-version <version> [--force]
```

**옵션:**
- `--force`: Convex `appVersions` 테이블에 강제 업데이트 레코드를 추가/활성화합니다.

**예시:**
```bash
# 버전만 올리기
/update-version 1.7.0

# 버전 올리기 + 강제 업데이트 설정
/update-version 1.7.0 --force
```

## 절차

### 1단계: package.json 버전 변경

`package.json`의 `"version"` 필드를 지정된 버전으로 수정합니다.

### 2단계: (--force 옵션일 때만) Convex 강제 업데이트 설정

Convex dev 서버에 push 후 mutation을 실행합니다:

```bash
npx convex dev --once --typecheck=disable
npx convex run appVersion/mutations:setForceUpdate '{"version": "<버전>", "shouldUpdate": true}'
```

prod에도 반영:

```bash
CONVEX_DEPLOYMENT="$(grep CONVEX_DEPLOYMENT .env.prod | cut -d= -f2)" npx convex deploy --typecheck=disable
CONVEX_DEPLOYMENT="$(grep CONVEX_DEPLOYMENT .env.prod | cut -d= -f2)" npx convex run appVersion/mutations:setForceUpdate '{"version": "<버전>", "shouldUpdate": true}'
```

### 3단계: 결과 안내

버전 변경 결과를 보여주고, `--force`인 경우 강제 업데이트가 설정되었음을 알립니다.

**주의:** `--force`는 스토어에 해당 버전이 이미 배포된 상태에서만 사용해야 합니다. 그렇지 않으면 사용자가 업데이트할 수 없는 상태에서 강제 업데이트 모달을 보게 됩니다.

## 관련 파일

| 파일 | 역할 |
|------|------|
| `package.json` | 앱 버전 (`version` 필드) |
| `config.ts` | `appVersion` export |
| `convex/appVersion/mutations.ts` | `setForceUpdate` mutation |
| `convex/appVersion/queries.ts` | `getForceUpdateVersion` 쿼리 |
| `src/modals/ForceUpdateModal.tsx` | 강제 업데이트 UI 모달 |
