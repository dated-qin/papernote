# ============================================
# 纸条 PaperNote — 后端 Dockerfile
# 多阶段构建: golang:alpine -> alpine
# ============================================

FROM golang:1.22-alpine AS builder

# 国内镜像加速
RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.ustc.edu.cn/g' /etc/apk/repositories
RUN apk add --no-cache git ca-certificates tzdata

WORKDIR /app

# 依赖缓存层（国内镜像代理加速）
ENV GOPROXY=https://goproxy.cn,direct
COPY go.mod go.sum ./
RUN go mod download

# 构建
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o server ./cmd/server

# ---------- 运行阶段 ----------
FROM alpine:3.20

RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.ustc.edu.cn/g' /etc/apk/repositories
RUN apk add --no-cache ca-certificates tzdata

COPY --from=builder /app/server /server
COPY --from=builder /app/migrations /migrations

EXPOSE 8080 8081

CMD ["/server"]
