#!/bin/bash
set -e

echo "🚀 Амжуулъя → GitHub push эхэлж байна..."

# Git repo эхлүүл (хэрэв байхгүй бол)
if [ ! -d ".git" ]; then
  git init
  git remote add origin https://github.com/Portal25/amjuulya.git
  echo "✓ Git repo үүслээ"
fi

# Бүх файл нэм
git add -A
git status

# Commit
git commit -m "🚀 Амжуулъя MVP - Full source code

- Next.js 14 App Router
- Supabase холболт (SSR)
- Auth хуудас
- Даалгавар нийтлэх/харах/авах
- Wallet (escrow)
- Chat
- Profile
- Admin panel
- Mobile-first UI"

# Push
echo ""
echo "📤 GitHub руу push хийж байна..."
git push -u origin main --force

echo ""
echo "✅ Амжилттай! Vercel автоматаар deploy эхлэх болно."
echo "🌐 https://amjuulya.vercel.app"
