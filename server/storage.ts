import { type Produto, type InsertProduto, type Venda, type InsertVenda, type Configuracao } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // Produtos
  getProdutos(): Promise<Produto[]>;
  getProduto(id: string): Promise<Produto | undefined>;
  createProduto(produto: InsertProduto): Promise<Produto>;
  updateProduto(id: string, produto: Partial<Produto>): Promise<Produto | undefined>;
  deleteProduto(id: string): Promise<boolean>;
  
  // Vendas
  getVendas(): Promise<Venda[]>;
  createVenda(venda: InsertVenda): Promise<Venda>;
  
  // Configurações
  getConfig(): Promise<Configuracao>;
  updateConfig(config: Partial<Configuracao>): Promise<Configuracao>;
}

export class MemStorage implements IStorage {
  private produtos: Map<string, Produto>;
  private vendas: Map<string, Venda>;
  private config: Configuracao;

  constructor() {
    this.produtos = new Map();
    this.vendas = new Map();
    this.config = {
      id: "config",
      whatsappGestor: "",
      senhaGestor: "sucesso2026",
    };

    // Initialize with sample products
    const sampleProducts = [
      { nome: 'Camiseta', quantidade: 10, preco: 49.90, imagemURL: '' },
      { nome: 'Boné', quantidade: 5, preco: 29.90, imagemURL: '' },
      { nome: 'Chinelo', quantidade: 8, preco: 34.50, imagemURL: '' }
    ];

    sampleProducts.forEach(p => {
      const id = randomUUID();
      this.produtos.set(id, { id, ...p });
    });
  }

  async getProdutos(): Promise<Produto[]> {
    return Array.from(this.produtos.values());
  }

  async getProduto(id: string): Promise<Produto | undefined> {
    return this.produtos.get(id);
  }

  async createProduto(insertProduto: InsertProduto): Promise<Produto> {
    const id = randomUUID();
    const produto: Produto = { 
      id, 
      nome: insertProduto.nome,
      quantidade: insertProduto.quantidade ?? 0,
      preco: insertProduto.preco,
      imagemURL: insertProduto.imagemURL ?? null,
    };
    this.produtos.set(id, produto);
    return produto;
  }

  async updateProduto(id: string, updates: Partial<Produto>): Promise<Produto | undefined> {
    const produto = this.produtos.get(id);
    if (!produto) return undefined;
    
    const updated: Produto = { 
      ...produto, 
      ...updates, 
      id,
      nome: updates.nome ?? produto.nome,
      quantidade: updates.quantidade ?? produto.quantidade,
      preco: updates.preco ?? produto.preco,
      imagemURL: updates.imagemURL ?? produto.imagemURL,
    };
    this.produtos.set(id, updated);
    return updated;
  }

  async deleteProduto(id: string): Promise<boolean> {
    return this.produtos.delete(id);
  }

  async getVendas(): Promise<Venda[]> {
    return Array.from(this.vendas.values()).sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }

  async createVenda(insertVenda: InsertVenda): Promise<Venda> {
    const id = randomUUID();
    const venda: Venda = {
      id,
      ...insertVenda,
      timestamp: new Date(),
    };
    this.vendas.set(id, venda);

    // Update product quantities
    const itens = JSON.parse(insertVenda.itens);
    for (const item of itens) {
      const entries = Array.from(this.produtos.entries());
      for (const [pid, produto] of entries) {
        if (produto.nome === item.nome) {
          produto.quantidade -= item.qtd;
          this.produtos.set(pid, produto);
        }
      }
    }

    return venda;
  }

  async getConfig(): Promise<Configuracao> {
    return this.config;
  }

  async updateConfig(updates: Partial<Configuracao>): Promise<Configuracao> {
    this.config = { ...this.config, ...updates };
    return this.config;
  }
}

export const storage = new MemStorage();
