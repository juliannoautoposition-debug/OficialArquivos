import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { connectWebSocket, disconnectWebSocket } from "@/lib/websocket";
import type { Produto, CartItem, Venda } from "@shared/schema";

declare const bootstrap: any;

export default function VendasApp() {
  const [activeTab, setActiveTab] = useState<'vendas' | 'estoque' | 'historico'>('vendas');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [estoqueLogado, setEstoqueLogado] = useState(false);
  const [senhaInput, setSenhaInput] = useState("");
  const [senhaErro, setSenhaErro] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Produto | null>(null);
  const [editingCartIndex, setEditingCartIndex] = useState<number | null>(null);
  const [newProduct, setNewProduct] = useState({ nome: "", quantidade: 0, preco: 0, imagemURL: "" });
  const [whatsappGestor, setWhatsappGestor] = useState("");
  const [successModal, setSuccessModal] = useState({ show: false, title: "", message: "" });
  const [imageFile, setImageFile] = useState<File | null>(null);

  const senhaModalRef = useRef<any>(null);
  const editModalRef = useRef<any>(null);
  const editCartModalRef = useRef<any>(null);

  useEffect(() => {
    connectWebSocket();
    return () => {
      disconnectWebSocket();
    };
  }, []);

  const { data: produtos = [], isLoading: produtosLoading } = useQuery<Produto[]>({
    queryKey: ["/api/produtos"],
  });

  const { data: historico = [] } = useQuery<Venda[]>({
    queryKey: ["/api/vendas"],
    enabled: activeTab === 'historico',
  });

  const { data: config } = useQuery<{ whatsappGestor: string; senhaGestor: string }>({
    queryKey: ["/api/config"],
  });

  useEffect(() => {
    if (config?.whatsappGestor) {
      setWhatsappGestor(config.whatsappGestor);
    }
  }, [config]);

  useEffect(() => {
    setQuantities(prev => {
      const newQtys = { ...prev };
      let hasChanges = false;
      
      produtos.forEach(p => {
        if (!(p.id in newQtys)) {
          newQtys[p.id] = 1;
          hasChanges = true;
        }
      });
      
      return hasChanges ? newQtys : prev;
    });
  }, [produtos]);

  const createProductMutation = useMutation({
    mutationFn: async (data: typeof newProduct) => {
      return await apiRequest("POST", "/api/produtos", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/produtos"] });
      setNewProduct({ nome: "", quantidade: 0, preco: 0, imagemURL: "" });
      setImageFile(null);
      mostrarModalSucesso("Produto Adicionado!", "Produto cadastrado com sucesso");
    },
  });

  const updateProductMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Produto> }) => {
      return await apiRequest("PUT", `/api/produtos/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/produtos"] });
      editModalRef.current?.hide();
      mostrarModalSucesso("Atualizado!", "Produto atualizado com sucesso");
    },
  });

  const deleteProductMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/produtos/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/produtos"] });
      mostrarModalSucesso("Excluído!", "Produto removido do estoque");
    },
  });

  const createVendaMutation = useMutation({
    mutationFn: async (venda: { data: string; total: number; itens: string }) => {
      return await apiRequest("POST", "/api/vendas", venda);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vendas"] });
      queryClient.invalidateQueries({ queryKey: ["/api/produtos"] });
    },
  });

  const updateConfigMutation = useMutation({
    mutationFn: async (whatsapp: string) => {
      return await apiRequest("PUT", "/api/config", { whatsappGestor: whatsapp });
    },
  });

  const mostrarModalSucesso = (title: string, message: string) => {
    setSuccessModal({ show: true, title, message });
    setTimeout(() => {
      setSuccessModal({ show: false, title: "", message: "" });
    }, 2500);
  };

  const adicionarAoCarrinho = (produto: Produto) => {
    const qtd = quantities[produto.id] || 1;
    if (produto.quantidade < qtd) {
      mostrarModalSucesso("Ops!", "Estoque insuficiente para este produto");
      return;
    }

    const existingItem = cart.find(item => item.nome === produto.nome);
    if (existingItem) {
      setCart(cart.map(item =>
        item.nome === produto.nome
          ? { ...item, qtd: item.qtd + qtd }
          : item
      ));
    } else {
      setCart([...cart, { nome: produto.nome, preco: produto.preco, qtd }]);
    }

    mostrarModalSucesso("Adicionado!", `${qtd}x ${produto.nome} adicionado ao carrinho`);
  };

  const removerDoCarrinho = (index: number) => {
    setCart(cart.filter((_, i) => i !== index));
  };

  const finalizarVenda = async () => {
    if (cart.length === 0) {
      mostrarModalSucesso("Carrinho Vazio!", "Adicione produtos antes de finalizar");
      return;
    }

    const total = cart.reduce((sum, item) => sum + item.preco * item.qtd, 0);
    const now = new Date();
    const data = `${now.toLocaleDateString('pt-BR')} ${now.toLocaleTimeString('pt-BR')}`;

    const venda = {
      data,
      total,
      itens: JSON.stringify(cart),
    };

    await createVendaMutation.mutateAsync(venda);

    if (whatsappGestor) {
      enviarWhatsApp({ data, total, itens: cart });
    }

    setCart([]);
    mostrarModalSucesso("Venda Finalizada!", `Total: R$ ${total.toFixed(2)}`);
  };

  const enviarWhatsApp = (venda: { data: string; total: number; itens: CartItem[] }) => {
    let raw = (whatsappGestor || "").replace(/\s+/g, "").replace(/\D/g, "");
    if (!raw) return;
    const numero = raw.startsWith("55") ? raw : "55" + raw;
    let mensagem = `🛒 *NOVA VENDA REALIZADA*\n\n`;
    mensagem += `📅 Data: ${venda.data}\n\n`;
    mensagem += `📦 *Itens vendidos:*\n`;
    venda.itens.forEach(item => {
      mensagem += `• ${item.nome} - ${item.qtd}x R$ ${item.preco.toFixed(2)}\n`;
    });
    mensagem += `\n💰 *Total: R$ ${venda.total.toFixed(2)}*`;
    const encoded = encodeURIComponent(mensagem);
    const webUrl = `https://wa.me/${numero}?text=${encoded}`;
    window.open(webUrl, "_blank");
  };

  const handleLoginEstoque = () => {
    if (senhaInput === (config?.senhaGestor || "sucesso2026")) {
      setEstoqueLogado(true);
      setSenhaErro(false);
      senhaModalRef.current?.hide();
    } else {
      setSenhaErro(true);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewProduct({ ...newProduct, imagemURL: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmitNewProduct = (e: React.FormEvent) => {
    e.preventDefault();
    createProductMutation.mutate(newProduct);
  };

  const totalVenda = cart.reduce((sum, item) => sum + item.preco * item.qtd, 0);

  return (
    <>
      <style>{`
        :root{--verde:#3f1e00;--fundo:#f8f9fa;}
        body{background:var(--fundo);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;}
        .navbar{background:var(--verde)!important;position:relative;}
        .navbar .nav-link,.navbar-brand{color:#fff!important;}
        .img-side{width:110px;height:90px;display:flex;align-items:center;justify-content:center;background:#fff;border-radius:8px;overflow:hidden;border:1px solid rgba(0,0,0,0.04);}
        .img-side img{max-width:100%;max-height:100%;object-fit:contain;}
        .card-product{border-radius:10px;transition:transform 0.2s,box-shadow 0.2s;}
        .card-product:hover{transform:translateY(-2px);box-shadow:0 4px 12px rgba(0,0,0,0.15)!important;}
        .small-muted{font-size:.9rem;color:#6c757d;}
        .quantidade-controle{display:flex;align-items:center;gap:8px;flex-wrap:wrap;justify-content:center;}
        .quantidade-controle .btn-menos,.quantidade-controle .btn-mais{width:34px;height:34px;padding:0;border-radius:6px;color:#fff;border:none;display:inline-flex;align-items:center;justify-content:center;font-size:1.2rem;font-weight:bold;}
        .btn-menos{background:#dc3545;}
        .btn-menos:hover{background:#c82333;}
        .btn-mais{background:#28a745;}
        .btn-mais:hover{background:#218838;}
        .quantidade-controle input{width:60px;height:34px;text-align:center;border-radius:6px;border:1px solid #ddd;}
        .btn-add{background:#ffc107;color:#000;border-radius:8px;font-weight:600;height:40px;min-width:120px;display:inline-flex;align-items:center;justify-content:center;gap:8px;border:none;}
        .btn-add:hover{background:#e0a800;}
        .card-estoque{border-radius:10px;transition:transform 0.2s,box-shadow 0.2s;}
        .card-estoque:hover{transform:translateY(-2px);box-shadow:0 4px 12px rgba(0,0,0,0.15)!important;}
        .img-estoque{width:80px;height:70px;display:flex;align-items:center;justify-content:center;background:#fff;border-radius:8px;overflow:hidden;border:1px solid rgba(0,0,0,0.08);flex-shrink:0;}
        .img-estoque img{max-width:100%;max-height:100%;object-fit:contain;}
        .estoque-info{flex:1;min-width:0;}
        .estoque-info h6{margin:0 0 8px 0;font-size:1rem;font-weight:600;color:#212529;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
        .estoque-preco{font-size:0.95rem;color:#6c757d;margin-bottom:4px;}
        .estoque-preco b{color:#198754;font-size:1.05rem;}
        .estoque-qtd{font-size:0.9rem;color:#6c757d;}
        .estoque-acoes{display:flex;gap:6px;flex-shrink:0;}
        .btn-icon{width:36px;height:36px;border-radius:6px;border:none;display:inline-flex;align-items:center;justify-content:center;cursor:pointer;transition:all 0.2s;}
        .btn-edit{background:#0d6efd;color:#fff;}
        .btn-edit:hover{background:#0b5ed7;}
        .btn-delete{background:#dc3545;color:#fff;}
        .btn-delete:hover{background:#c82333;}
        .modal-sucesso{display:none;position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:9999;align-items:center;justify-content:center;}
        .modal-sucesso.show{display:flex;animation:fadeIn 0.3s;}
        .modal-sucesso-content{background:#fff;border-radius:20px;padding:40px;text-align:center;max-width:400px;margin:20px;animation:slideUp 0.4s;box-shadow:0 10px 40px rgba(0,0,0,0.2);}
        .check-animation{width:80px;height:80px;border-radius:50%;background:#198754;margin:0 auto 20px;display:flex;align-items:center;justify-content:center;animation:scaleIn 0.5s;}
        .check-animation i{color:#fff;font-size:40px;}
        @keyframes fadeIn{from{opacity:0;}to{opacity:1;}}
        @keyframes slideUp{from{transform:translateY(50px);opacity:0;}to{transform:translateY(0);opacity:1;}}
        @keyframes scaleIn{0%{transform:scale(0);}50%{transform:scale(1.1);}100%{transform:scale(1);}}
        .whatsapp-config{margin-top:20px;padding:15px;background:#f0f0f0;border-radius:8px;}
        @media(max-width:767px){.img-side{width:70px;height:60px;}.quantidade-controle input{width:50px;}.btn-add{width:100%;margin-top:8px;}.img-estoque{width:60px;height:55px;}.card-product .col-auto{width:100%;}.quantidade-controle{justify-content:flex-start;}.modal-sucesso-content{padding:30px 20px;}.check-animation{width:60px;height:60px;}.check-animation i{font-size:30px;}.navbar-nav{flex-direction:row;gap:5px;}.navbar-nav .nav-link{font-size:0.85rem;padding:8px!important;}.estoque-acoes{margin-top:8px;}h4{font-size:1.3rem;}.container{padding-left:10px;padding-right:10px;}}
      `}</style>

      <nav className="navbar navbar-expand-lg mb-4">
        <div className="container-fluid">
          <a className="navbar-brand fw-bold" data-testid="link-brand">
            <i className="bi bi-shop"></i> App de Vendas
          </a>
          <ul className="navbar-nav ms-auto">
            <li className="nav-item">
              <a
                className="nav-link"
                href="#"
                onClick={(e) => { e.preventDefault(); setActiveTab('vendas'); }}
                data-testid="link-vendas"
              >
                <i className="bi bi-cart2 me-1"></i> Vendas
              </a>
            </li>
            <li className="nav-item">
              <a
                className="nav-link"
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  if (!estoqueLogado) {
                    setSenhaErro(false);
                    setSenhaInput("");
                    const modal = new bootstrap.Modal(document.getElementById('modalSenha'));
                    senhaModalRef.current = modal;
                    modal.show();
                  } else {
                    setActiveTab('estoque');
                  }
                }}
                data-testid="link-estoque"
              >
                <i className="bi bi-box-seam me-1"></i> Estoque
              </a>
            </li>
            <li className="nav-item">
              <a
                className="nav-link"
                href="#"
                onClick={(e) => { e.preventDefault(); setActiveTab('historico'); }}
                data-testid="link-historico"
              >
                <i className="bi bi-clock-history me-1"></i> Histórico
              </a>
            </li>
          </ul>
        </div>
      </nav>

      <div className="container mb-5">
        {activeTab === 'vendas' && (
          <div data-testid="tela-vendas">
            <div className="row">
              <div className="col-md-8">
                <h4 className="text-success mb-3">
                  <i className="bi bi-bag"></i> Produtos
                </h4>
                <div className="row g-3" data-testid="lista-produtos">
                  {produtosLoading && <div className="col-12 text-center">Carregando...</div>}
                  {produtos.map((produto) => {
                    const img = produto.imagemURL || 'https://via.placeholder.com/300x150?text=Sem+Imagem';
                    return (
                      <div key={produto.id} className="col-12">
                        <div className="card card-product shadow-sm p-2 mb-2" data-testid={`card-product-${produto.id}`}>
                          <div className="row align-items-center g-2">
                            <div className="col-auto">
                              <div className="img-side">
                                <img src={img} alt={produto.nome} />
                              </div>
                            </div>
                            <div className="col">
                              <h6 className="mb-1" data-testid={`text-product-name-${produto.id}`}>{produto.nome}</h6>
                              <div className="small-muted">
                                R$ <b data-testid={`text-product-price-${produto.id}`}>{produto.preco.toFixed(2)}</b> • Estoque:{" "}
                                <span className="badge bg-success" data-testid={`text-product-stock-${produto.id}`}>{produto.quantidade}</span>
                              </div>
                            </div>
                            <div className="col-auto">
                              <div className="quantidade-controle mb-2">
                                <button
                                  className="btn-menos"
                                  onClick={() => {
                                    setQuantities(prev => ({
                                      ...prev,
                                      [produto.id]: Math.max(1, (prev[produto.id] || 1) - 1)
                                    }));
                                  }}
                                  data-testid={`button-decrease-${produto.id}`}
                                >
                                  −
                                </button>
                                <input
                                  type="number"
                                  value={quantities[produto.id] || 1}
                                  onChange={(e) => {
                                    const val = parseInt(e.target.value) || 1;
                                    setQuantities(prev => ({ ...prev, [produto.id]: Math.max(1, val) }));
                                  }}
                                  min="1"
                                  data-testid={`input-quantity-${produto.id}`}
                                />
                                <button
                                  className="btn-mais"
                                  onClick={() => {
                                    setQuantities(prev => ({
                                      ...prev,
                                      [produto.id]: (prev[produto.id] || 1) + 1
                                    }));
                                  }}
                                  data-testid={`button-increase-${produto.id}`}
                                >
                                  +
                                </button>
                              </div>
                              <div>
                                <button
                                  className="btn-add"
                                  onClick={() => adicionarAoCarrinho(produto)}
                                  data-testid={`button-add-to-cart-${produto.id}`}
                                >
                                  <i className="bi bi-cart-plus"></i> Adicionar
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="col-md-4">
                <h4 className="text-success mb-3">
                  <i className="bi bi-basket3"></i> Carrinho
                </h4>
                <ul className="list-group mb-3" data-testid="lista-carrinho">
                  {cart.length === 0 && (
                    <li className="list-group-item text-muted">Carrinho vazio.</li>
                  )}
                  {cart.map((item, idx) => {
                    const subtotal = item.preco * item.qtd;
                    return (
                      <li key={idx} className="list-group-item d-flex justify-content-between align-items-center" data-testid={`cart-item-${idx}`}>
                        <div style={{ minWidth: 0 }}>
                          <b>{item.nome}</b>
                          <div className="small-muted">
                            {item.qtd}x R$ {item.preco.toFixed(2)}
                          </div>
                        </div>
                        <div className="d-flex align-items-center gap-2">
                          <button
                            className="btn-icon"
                            onClick={() => {
                              setEditingCartIndex(idx);
                              const modal = new bootstrap.Modal(document.getElementById('modalEditarCarrinho'));
                              editCartModalRef.current = modal;
                              modal.show();
                            }}
                            title="Editar quantidade"
                            style={{
                              width: "36px",
                              height: "36px",
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              borderRadius: "6px",
                              border: "none",
                              background: "#0d6efd",
                              color: "#fff",
                              cursor: "pointer"
                            }}
                            data-testid={`button-edit-cart-${idx}`}
                          >
                            <i className="bi bi-pencil"></i>
                          </button>
                          <button
                            className="btn-icon"
                            onClick={() => removerDoCarrinho(idx)}
                            title="Remover"
                            style={{
                              width: "36px",
                              height: "36px",
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              borderRadius: "6px",
                              border: "none",
                              background: "#dc3545",
                              color: "#fff",
                              cursor: "pointer"
                            }}
                            data-testid={`button-remove-cart-${idx}`}
                          >
                            <i className="bi bi-trash"></i>
                          </button>
                          <div className="fw-bold ms-2">R$ {subtotal.toFixed(2)}</div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
                <h5 className="text-end fw-bold text-success">
                  Total: R$ <span data-testid="text-total">{totalVenda.toFixed(2)}</span>
                </h5>
                <button
                  className="btn btn-success w-100 mt-2"
                  onClick={finalizarVenda}
                  data-testid="button-finalizar-venda"
                >
                  <i className="bi bi-check2-circle"></i> Finalizar Venda
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'estoque' && (
          <div data-testid="tela-estoque">
            <div className="card shadow-sm mb-4">
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-center flex-wrap">
                  <h4 className="mb-0 text-success">
                    <i className="bi bi-box-seam"></i> Gestão de Estoque
                  </h4>
                  {estoqueLogado && (
                    <button
                      className="btn btn-outline-secondary mt-2 mt-md-0"
                      onClick={() => {
                        setEstoqueLogado(false);
                        setActiveTab('vendas');
                      }}
                      data-testid="button-sair-estoque"
                    >
                      <i className="bi bi-box-arrow-right"></i> Sair
                    </button>
                  )}
                </div>
                {estoqueLogado && (
                  <div className="mt-3" data-testid="painel-estoque">
                    <div className="whatsapp-config">
                      <label className="form-label">
                        <i className="bi bi-whatsapp text-success"></i> WhatsApp do Gestor (com DDD)
                      </label>
                      <input
                        className="form-control"
                        type="tel"
                        placeholder="Ex: 11987654321"
                        value={whatsappGestor}
                        onChange={(e) => {
                          const val = e.target.value.trim();
                          setWhatsappGestor(val);
                          updateConfigMutation.mutate(val);
                        }}
                        data-testid="input-whatsapp"
                      />
                      <small className="text-muted">
                        As vendas serão enviadas automaticamente para este número
                      </small>
                    </div>
                    <hr className="my-3" />
                    <form onSubmit={handleSubmitNewProduct} className="row g-3 align-items-end">
                      <div className="col-md-4 col-12">
                        <label className="form-label small">Nome do Produto</label>
                        <input
                          className="form-control"
                          placeholder="Ex: Camiseta"
                          required
                          value={newProduct.nome}
                          onChange={(e) => setNewProduct({ ...newProduct, nome: e.target.value })}
                          data-testid="input-novo-produto-nome"
                        />
                      </div>
                      <div className="col-md-2 col-6">
                        <label className="form-label small">Quantidade</label>
                        <input
                          className="form-control"
                          type="number"
                          placeholder="Qtd"
                          min="0"
                          required
                          value={newProduct.quantidade || ""}
                          onChange={(e) => setNewProduct({ ...newProduct, quantidade: parseInt(e.target.value) || 0 })}
                          data-testid="input-novo-produto-quantidade"
                        />
                      </div>
                      <div className="col-md-2 col-6">
                        <label className="form-label small">Preço (R$)</label>
                        <input
                          className="form-control"
                          type="number"
                          placeholder="0.00"
                          step="0.01"
                          min="0"
                          required
                          value={newProduct.preco || ""}
                          onChange={(e) => setNewProduct({ ...newProduct, preco: parseFloat(e.target.value) || 0 })}
                          data-testid="input-novo-produto-preco"
                        />
                      </div>
                      <div className="col-md-3 col-12">
                        <label className="form-label small">Imagem</label>
                        <input
                          className="form-control"
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          data-testid="input-novo-produto-imagem"
                        />
                      </div>
                      <div className="col-md-1 col-12">
                        <button className="btn btn-success w-100" type="submit" data-testid="button-adicionar-produto">
                          <i className="bi bi-plus-lg"></i>
                        </button>
                      </div>
                    </form>
                    <hr className="my-3" />
                    <h6 className="small-muted mb-3">
                      <i className="bi bi-boxes"></i> Produtos no estoque
                    </h6>
                    <div className="row g-3" data-testid="lista-estoque">
                      {produtos.map((produto) => {
                        const img = produto.imagemURL || 'https://via.placeholder.com/150x80?text=Sem+Imagem';
                        return (
                          <div key={produto.id} className="col-12">
                            <div className="card card-estoque shadow-sm p-2" data-testid={`card-estoque-${produto.id}`}>
                              <div className="d-flex align-items-center gap-3 flex-wrap">
                                <div className="img-estoque">
                                  <img src={img} alt={produto.nome} />
                                </div>
                                <div className="estoque-info">
                                  <h6>{produto.nome}</h6>
                                  <div className="estoque-preco">
                                    Preço: <b>R$ {produto.preco.toFixed(2)}</b>
                                  </div>
                                  <div className="estoque-qtd">
                                    Qtd: {produto.quantidade} unidade(s)
                                  </div>
                                </div>
                                <div className="estoque-acoes">
                                  <button
                                    className="btn-icon btn-edit"
                                    onClick={() => {
                                      setEditingProduct(produto);
                                      const modal = new bootstrap.Modal(document.getElementById('modalEditarProduto'));
                                      editModalRef.current = modal;
                                      modal.show();
                                    }}
                                    data-testid={`button-edit-produto-${produto.id}`}
                                  >
                                    <i className="bi bi-pencil"></i>
                                  </button>
                                  <button
                                    className="btn-icon btn-delete"
                                    onClick={() => {
                                      if (confirm(`Deseja realmente excluir ${produto.nome}?`)) {
                                        deleteProductMutation.mutate(produto.id);
                                      }
                                    }}
                                    data-testid={`button-delete-produto-${produto.id}`}
                                  >
                                    <i className="bi bi-trash"></i>
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'historico' && (
          <div data-testid="tela-historico">
            <div className="card shadow-sm">
              <div className="card-body">
                <h4 className="text-success mb-3">
                  <i className="bi bi-clock-history"></i> Histórico de Vendas
                </h4>
                <div data-testid="area-historico">
                  {historico.length === 0 && (
                    <p className="text-muted">Nenhuma venda realizada ainda.</p>
                  )}
                  {[...historico].reverse().map((venda, idx) => {
                    const itens: CartItem[] = JSON.parse(venda.itens);
                    return (
                      <div key={venda.id} className="card mb-3" data-testid={`venda-${idx}`}>
                        <div className="card-body">
                          <div className="d-flex justify-content-between align-items-center mb-2">
                            <h6 className="mb-0">
                              <i className="bi bi-calendar-check text-success"></i> {venda.data}
                            </h6>
                            <span className="badge bg-success">R$ {venda.total.toFixed(2)}</span>
                          </div>
                          <ul className="list-group list-group-flush">
                            {itens.map((item, i) => (
                              <li key={i} className="list-group-item d-flex justify-content-between">
                                <span>{item.nome}</span>
                                <span className="text-muted">
                                  {item.qtd}x R$ {item.preco.toFixed(2)}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="modal fade" id="modalSenha" tabIndex={-1} aria-hidden="true">
        <div className="modal-dialog modal-sm modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-header">
              <h6 className="modal-title">
                <i className="bi bi-lock-fill"></i> Acesso Estoque
              </h6>
              <button type="button" className="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div className="modal-body">
              <input
                className="form-control"
                type="password"
                placeholder="Senha do gestor"
                value={senhaInput}
                onChange={(e) => setSenhaInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleLoginEstoque()}
                data-testid="input-senha"
              />
              {senhaErro && (
                <div className="text-danger mt-2" data-testid="text-senha-erro">Senha incorreta.</div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline-secondary" data-bs-dismiss="modal" data-testid="button-cancelar-senha">
                Cancelar
              </button>
              <button className="btn btn-success" onClick={handleLoginEstoque} data-testid="button-confirmar-senha">
                Entrar
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="modal fade" id="modalEditarProduto" tabIndex={-1} aria-hidden="true">
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-header">
              <h6 className="modal-title">
                <i className="bi bi-pencil-fill"></i> Editar Produto
              </h6>
              <button type="button" className="btn-close" data-bs-dismiss="modal"></button>
            </div>
            {editingProduct && (
              <>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label">Nome</label>
                    <input
                      className="form-control"
                      type="text"
                      value={editingProduct.nome}
                      onChange={(e) => setEditingProduct({ ...editingProduct, nome: e.target.value })}
                      data-testid="input-editar-nome"
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Quantidade</label>
                    <input
                      className="form-control"
                      type="number"
                      min="0"
                      value={editingProduct.quantidade}
                      onChange={(e) => setEditingProduct({ ...editingProduct, quantidade: parseInt(e.target.value) || 0 })}
                      data-testid="input-editar-quantidade"
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Preço (R$)</label>
                    <input
                      className="form-control"
                      type="number"
                      step="0.01"
                      min="0"
                      value={editingProduct.preco}
                      onChange={(e) => setEditingProduct({ ...editingProduct, preco: parseFloat(e.target.value) || 0 })}
                      data-testid="input-editar-preco"
                    />
                  </div>
                </div>
                <div className="modal-footer">
                  <button className="btn btn-outline-secondary" data-bs-dismiss="modal" data-testid="button-cancelar-edicao">
                    Cancelar
                  </button>
                  <button
                    className="btn btn-success"
                    onClick={() => {
                      updateProductMutation.mutate({
                        id: editingProduct.id,
                        data: {
                          nome: editingProduct.nome,
                          quantidade: editingProduct.quantidade,
                          preco: editingProduct.preco,
                        },
                      });
                    }}
                    data-testid="button-salvar-edicao"
                  >
                    Salvar
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="modal fade" id="modalEditarCarrinho" tabIndex={-1} aria-hidden="true">
        <div className="modal-dialog modal-sm modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-header">
              <h6 className="modal-title">
                <i className="bi bi-pencil-fill"></i> Editar Item
              </h6>
              <button type="button" className="btn-close" data-bs-dismiss="modal"></button>
            </div>
            {editingCartIndex !== null && cart[editingCartIndex] && (
              <>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label fw-bold">{cart[editingCartIndex].nome}</label>
                    <small className="text-muted d-block">
                      R$ {cart[editingCartIndex].preco.toFixed(2)}
                    </small>
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Quantidade</label>
                    <input
                      className="form-control"
                      type="number"
                      min="1"
                      value={cart[editingCartIndex].qtd}
                      onChange={(e) => {
                        const newQtd = parseInt(e.target.value) || 1;
                        setCart(cart.map((item, i) =>
                          i === editingCartIndex ? { ...item, qtd: newQtd } : item
                        ));
                      }}
                      data-testid="input-editar-carrinho-quantidade"
                    />
                    <small className="text-muted">
                      Estoque disponível: {
                        produtos.find(p => p.nome === cart[editingCartIndex].nome)?.quantidade || 0
                      } unidade(s)
                    </small>
                  </div>
                </div>
                <div className="modal-footer">
                  <button className="btn btn-outline-secondary" data-bs-dismiss="modal" data-testid="button-cancelar-carrinho">
                    Cancelar
                  </button>
                  <button
                    className="btn btn-success"
                    onClick={() => editCartModalRef.current?.hide()}
                    data-testid="button-salvar-carrinho"
                  >
                    Salvar
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div className={`modal-sucesso ${successModal.show ? 'show' : ''}`}>
        <div className="modal-sucesso-content">
          <div className="check-animation">
            <i className="bi bi-check-lg"></i>
          </div>
          <h4>{successModal.title}</h4>
          <p>{successModal.message}</p>
        </div>
      </div>
    </>
  );
}
