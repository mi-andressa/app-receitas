
cd "$(dirname "$0")"

if [ ! -d .venv ]; then
  echo "Ambiente virtual não encontrado. Rode: python3 -m venv .venv && .venv/bin/pip install -r requirements.txt"
  exit 1
fi
if [ ! -d node_modules ]; then
  echo "Dependências do front-end não encontradas. Rode: npm install"
  exit 1
fi

source .venv/bin/activate
uvicorn api.index:app --reload --port 8000 &
API=$!
trap "kill $API 2>/dev/null" EXIT
sleep 2
npm run dev