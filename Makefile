init:
	mkdir -p backend frontend
	docker run --rm -v $(PWD)/frontend:/app -w /app node:22-alpine sh -c "if [ ! -f package.json ]; then npm create vite@latest . -- --template react --yes; npm install; fi"
up:
	docker-compose up --build

up-d:
	docker-compose up -d --build

down:
	docker-compose down

logs:
	docker-compose logs -f

install-3d-deps:
	docker-compose exec frontend npm install three @types/three @react-three/fiber @react-three/drei

clean-install-front:
	docker-compose exec frontend npm install