# ============================================
# 纸条 PaperNote — 后端 Dockerfile
# 多阶段构建: golang:alpine -> alpine
# ============================================

FROM golang:1.22-alpine AS builder

RUN apk add --no-cache git ca-certificates tzdata

WORKDIR /app

# 依赖缓存层
COPY go.mod go.sum ./
RUN go mod download

# 构建
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o server ./cmd/server

# ---------- 运行阶段 ----------
FROM alpine:3.20

RUN apk add --no-cache ca-certificates tzdata

COPY --from=builder /app/server /server
COPY --from=builder /app/migrations /migrations

EXPOSE 8080 8081

CMD ["/server"]
