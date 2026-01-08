init:
	mkdir -p backend frontend
	# Use Node 22 and add 'yes' to avoid blocking interaction
	docker run --rm -v $(PWD)/frontend:/app -w /app node:22-alpine sh -c "if [ ! -f package.json ]; then npm create vite@latest . -- --template react --yes; npm install; fi"

up:
	docker compose up --build

up-d:
	docker compose up -d --build

down:
	docker compose down

logs:
	docker compose logs -f

clean-install-front:
	docker compose exec frontend npm install

install-3d-deps:
	docker compose exec frontend npm install three @types/three @react-three/fiber @react-three/drei

restart-back:
	docker compose restart backend

build-back:
	docker compose up -d --build backend

logs-back:
	docker compose logs -f backend