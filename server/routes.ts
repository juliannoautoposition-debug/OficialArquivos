import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { insertProdutoSchema, insertVendaSchema } from "@shared/schema";
import { z } from "zod";

const updateProdutoSchema = insertProdutoSchema.partial();
const updateConfigSchema = z.object({
  whatsappGestor: z.string().optional(),
  senhaGestor: z.string().optional(),
});

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);

  // WebSocket server for real-time updates
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  const broadcast = (message: { type: string; data: any }) => {
    const payload = JSON.stringify(message);
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(payload);
      }
    });
  };

  wss.on('connection', (ws) => {
    console.log('New WebSocket connection');

    ws.send(JSON.stringify({ type: 'initial_sync', data: { timestamp: Date.now() } }));

    ws.on('close', () => {
      console.log('WebSocket connection closed');
    });
  });

  // GET /api/produtos - List all products
  app.get("/api/produtos", async (_req, res) => {
    try {
      const produtos = await storage.getProdutos();
      res.json(produtos);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch products" });
    }
  });

  // POST /api/produtos - Create new product
  app.post("/api/produtos", async (req, res) => {
    try {
      const data = insertProdutoSchema.parse(req.body);
      const produto = await storage.createProduto(data);
      
      broadcast({ type: 'produto_created', data: produto });
      
      res.json(produto);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: error.errors });
      } else {
        res.status(500).json({ error: "Failed to create product" });
      }
    }
  });

  // PUT /api/produtos/:id - Update product
  app.put("/api/produtos/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const updates = updateProdutoSchema.parse(req.body);
      const produto = await storage.updateProduto(id, updates);
      
      if (!produto) {
        res.status(404).json({ error: "Product not found" });
        return;
      }

      broadcast({ type: 'produto_updated', data: produto });
      
      res.json(produto);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: error.errors });
      } else {
        res.status(500).json({ error: "Failed to update product" });
      }
    }
  });

  // DELETE /api/produtos/:id - Delete product
  app.delete("/api/produtos/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const success = await storage.deleteProduto(id);
      
      if (!success) {
        res.status(404).json({ error: "Product not found" });
        return;
      }

      broadcast({ type: 'produto_deleted', data: { id } });
      
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete product" });
    }
  });

  // GET /api/vendas - List all sales
  app.get("/api/vendas", async (_req, res) => {
    try {
      const vendas = await storage.getVendas();
      res.json(vendas);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch sales" });
    }
  });

  // POST /api/vendas - Create new sale
  app.post("/api/vendas", async (req, res) => {
    try {
      const data = insertVendaSchema.parse(req.body);
      const venda = await storage.createVenda(data);
      
      broadcast({ type: 'venda_created', data: venda });
      
      const produtos = await storage.getProdutos();
      broadcast({ type: 'produtos_updated', data: produtos });
      
      res.json(venda);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: error.errors });
      } else {
        res.status(500).json({ error: "Failed to create sale" });
      }
    }
  });

  // GET /api/config - Get configuration
  app.get("/api/config", async (_req, res) => {
    try {
      const config = await storage.getConfig();
      res.json(config);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch config" });
    }
  });

  // PUT /api/config - Update configuration
  app.put("/api/config", async (req, res) => {
    try {
      const updates = updateConfigSchema.parse(req.body);
      const config = await storage.updateConfig(updates);
      
      broadcast({ type: 'config_updated', data: config });
      
      res.json(config);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: error.errors });
      } else {
        res.status(500).json({ error: "Failed to update config" });
      }
    }
  });

  return httpServer;
}
