import { pgTable, text, varchar, integer, real, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const produtos = pgTable("produtos", {
  id: varchar("id").primaryKey(),
  nome: text("nome").notNull(),
  quantidade: integer("quantidade").notNull().default(0),
  preco: real("preco").notNull(),
  imagemURL: text("imagem_url").default(""),
});

export const vendas = pgTable("vendas", {
  id: varchar("id").primaryKey(),
  data: text("data").notNull(),
  total: real("total").notNull(),
  itens: text("itens").notNull(), // JSON string
  timestamp: timestamp("timestamp").notNull().defaultNow(),
});

export const configuracoes = pgTable("configuracoes", {
  id: varchar("id").primaryKey().default("config"),
  whatsappGestor: text("whatsapp_gestor").default(""),
  senhaGestor: text("senha_gestor").default("sucesso2026"),
});

export const insertProdutoSchema = createInsertSchema(produtos).omit({ id: true });
export const insertVendaSchema = createInsertSchema(vendas).omit({ id: true, timestamp: true });
export const insertConfiguracaoSchema = createInsertSchema(configuracoes).omit({ id: true });

export type InsertProduto = z.infer<typeof insertProdutoSchema>;
export type Produto = typeof produtos.$inferSelect;
export type InsertVenda = z.infer<typeof insertVendaSchema>;
export type Venda = typeof vendas.$inferSelect;
export type Configuracao = typeof configuracoes.$inferSelect;

// Cart item type
export interface CartItem {
  nome: string;
  preco: number;
  qtd: number;
}
