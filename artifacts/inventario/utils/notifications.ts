import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

import { EstadoPedido, Pedido } from "./storage";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const UMBRALES: Record<EstadoPedido, number> = {
  comprado: 5,
  en_casillero: 7,
  enviado_cuba: 14,
  en_almacen: 99999,
};

const ESTADO_LABELS: Record<EstadoPedido, string> = {
  comprado: "Comprado",
  en_casillero: "En casillero",
  enviado_cuba: "En camino a Cuba",
  en_almacen: "En almacén",
};

function diasDesde(fechaStr: string): number {
  const partes = fechaStr.split("-");
  if (partes.length < 3) return 0;
  const fecha = new Date(Number(partes[0]), Number(partes[1]) - 1, Number(partes[2]));
  fecha.setHours(0, 0, 0, 0);
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  return Math.floor((hoy.getTime() - fecha.getTime()) / 86_400_000);
}

async function tienePermiso(): Promise<boolean> {
  if (Platform.OS === "web") return false;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const perms: any = await Notifications.getPermissionsAsync();
  const concedido = perms.granted === true || perms.status === "granted";
  if (concedido) return true;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result: any = await Notifications.requestPermissionsAsync();
  return result.granted === true || result.status === "granted";
}

export async function pedirPermisoNotificaciones(): Promise<boolean> {
  return tienePermiso();
}

export async function cancelarTodasNotificaciones() {
  if (Platform.OS === "web") return;
  await Notifications.cancelAllScheduledNotificationsAsync();
}

export async function programarAlertasPedidos(pedidos: Pedido[]) {
  if (Platform.OS === "web") return;
  if (!(await tienePermiso())) return;

  await cancelarTodasNotificaciones();

  const atrasados = pedidos.filter((p) => {
    if (p.estado === "en_almacen") return false;
    const dias = diasDesde(p.fechaUltimoEstado ?? p.creadoEn);
    return dias >= UMBRALES[p.estado];
  });

  for (const p of atrasados) {
    const dias = diasDesde(p.fechaUltimoEstado ?? p.creadoEn);
    await Notifications.scheduleNotificationAsync({
      content: {
        title: `📦 Pedido #${p.numeroCompra} sin avance`,
        body: `Lleva ${dias} día${dias !== 1 ? "s" : ""} en "${ESTADO_LABELS[p.estado]}". ¿Ya avanzó?`,
        data: { pedidoId: p.id },
      },
      trigger: null,
    });
  }

  return atrasados.length;
}

export async function programarRecordatorioDiario(pedidos: Pedido[]) {
  if (Platform.OS === "web") return;
  if (!(await tienePermiso())) return;

  const atrasados = pedidos.filter((p) => {
    if (p.estado === "en_almacen") return false;
    const dias = diasDesde(p.fechaUltimoEstado ?? p.creadoEn);
    return dias >= UMBRALES[p.estado];
  });

  if (atrasados.length === 0) return;

  const manana = new Date();
  manana.setDate(manana.getDate() + 1);
  manana.setHours(10, 0, 0, 0);

  await Notifications.scheduleNotificationAsync({
    content: {
      title: "🚚 Inventario — pedidos pendientes",
      body: `${atrasados.length} pedido${atrasados.length !== 1 ? "s" : ""} sin actualizar. Abre la app para revisar.`,
      data: { tipo: "resumen" },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: manana,
    },
  });
}
