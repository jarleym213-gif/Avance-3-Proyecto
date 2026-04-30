import { supabase } from "./supabase.js";

const tbody = document.getElementById("tbodyVentas");

let modal;
document.addEventListener("DOMContentLoaded", () => {
  modal = new bootstrap.Modal(document.getElementById("modalDetalle"));
});

//Variables globales
let ventasGlobal = [];
let paginaActual = 1;
const filasPorPagina = 10;

// Cargar ventas al iniciar
window.onload = async () => {
  const { data, error } = await supabase
    .from("ventas")
    .select(`
      id,
      fecha,
      total,
      clientes(nombre),
      usuarios(correo)
    `)
    .order("id", { ascending: false });

  if (error) {
    console.error(error);
    return;
  }

  ventasGlobal = data;
renderVentasPaginadas();
renderPaginacion();
};

//Renderizar ventas
const renderVentasPaginadas = () => {

  tbody.innerHTML = "";

  const inicio = (paginaActual - 1) * filasPorPagina;
  const fin = inicio + filasPorPagina;

  const paginaData = ventasGlobal.slice(inicio, fin);

  paginaData.forEach(v => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${v.id}</td>
      <td>${v.clientes?.nombre || "-"}</td>
      <td>${v.usuarios?.correo || "-"}</td>
      <td>${new Date(v.fecha).toLocaleString("es-CR", { timeZone: "America/Costa_Rica" })}</td>
      <td>₡${v.total}</td>
      <td>
        <button class="btn btn-primary btn-sm btnDetalle" data-id="${v.id}">
          Ver detalle
        </button>
      </td>
    `;

    tbody.appendChild(tr);
  });
};

//generar botones de paginacion
const renderPaginacion = () => {

  const contenedor = document.getElementById("paginacion");
  contenedor.innerHTML = "";

  const totalPaginas = Math.ceil(ventasGlobal.length / filasPorPagina);

  for (let i = 1; i <= totalPaginas; i++) {
    const btn = document.createElement("button");

    btn.textContent = i;
    btn.className = "btn btn-sm " + (i === paginaActual ? "btn-primary" : "btn-outline-primary");

    btn.addEventListener("click", () => {
      paginaActual = i;
      renderVentasPaginadas();
      renderPaginacion();
    });

    contenedor.appendChild(btn);
  }
};



// Evento para mostrar detalle de venta
document.addEventListener("click", async (e) => {
  if (e.target.classList.contains("btnDetalle")) {
    const ventaId = e.target.dataset.id;
    await mostrarDetalle(ventaId);
  }
});

// MOSTRAR DETALLE DE VENTA EN MODAL
const mostrarDetalle = async (ventaId) => {

  // 1. INFO VENTA
  const { data: venta } = await supabase
    .from("ventas")
    .select(`
      id,
      fecha,
      total,
      clientes(nombre),
      usuarios(correo)
    `)
    .eq("id", ventaId)
    .single();

  // 2. DETALLE PRODUCTOS
  const { data: detalle } = await supabase
    .from("detalle_venta")
    .select(`
      cantidad,
      precio,
      productos(nombre)
    `)
    .eq("venta_id", ventaId);

  renderDetalle(venta, detalle);

  modal.show();
};

// RENDERIZAR DETALLE DE VENTA EN MODAL
const renderDetalle = (venta, detalle) => {

  const info = document.getElementById("infoVenta");
  const tbodyDetalle = document.getElementById("tbodyDetalle");
  const totalText = document.getElementById("totalDetalle");

  info.innerHTML = `
    <p><strong>Venta #:</strong> ${venta.id}</p>
    <p><strong>Cliente:</strong> ${venta.clientes?.nombre}</p>
    <p><strong>Vendedor:</strong> ${venta.usuarios?.correo}</p>
    <p><strong>Fecha:</strong> ${new Date(venta.fecha).toLocaleString("es-CR", {
  timeZone: "America/Costa_Rica",
  year: "numeric",
  month: "2-digit",
  day: "2-digit"
})}</p>
    <hr>
  `;

  tbodyDetalle.innerHTML = "";

  let total = 0;

  detalle.forEach(p => {
    const subtotal = p.precio * p.cantidad;
    total += subtotal;

    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${p.productos?.nombre}</td>
      <td>${p.cantidad}</td>
      <td>₡${p.precio}</td>
      <td>₡${subtotal}</td>
    `;

    tbodyDetalle.appendChild(tr);
  });

  totalText.innerText = "Total: ₡" + total;
};