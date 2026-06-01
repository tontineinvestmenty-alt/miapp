import { Feather } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { useColors } from "@/hooks/useColors";

const MESES = [
  "Enero","Febrero","Marzo","Abril","Mayo","Junio",
  "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre",
];
const DIAS_SEMANA = ["Lu","Ma","Mi","Ju","Vi","Sá","Do"];

interface Props {
  visible: boolean;
  value: string;
  onConfirm: (fecha: string) => void;
  onClose: () => void;
}

function parseDate(s: string): Date {
  if (!s) return new Date();
  const [d, m, y] = s.split("/").map(Number);
  const date = new Date(y, m - 1, d);
  return isNaN(date.getTime()) ? new Date() : date;
}

export default function CalendarPicker({ visible, value, onConfirm, onClose }: Props) {
  const colors = useColors();
  const initial = parseDate(value);
  const [mes, setMes] = useState(initial.getMonth());
  const [anio, setAnio] = useState(initial.getFullYear());
  const [diaSelec, setDiaSelec] = useState<number | null>(
    value ? initial.getDate() : null
  );
  const [mesSelec, setMesSelec] = useState<number | null>(
    value ? initial.getMonth() : null
  );
  const [anioSelec, setAnioSelec] = useState<number | null>(
    value ? initial.getFullYear() : null
  );

  const s = makeStyles(colors);

  function diasEnMes(m: number, y: number) {
    return new Date(y, m + 1, 0).getDate();
  }

  function primerDiaMes(m: number, y: number) {
    let d = new Date(y, m, 1).getDay();
    return d === 0 ? 6 : d - 1;
  }

  function mesPrev() {
    if (mes === 0) { setMes(11); setAnio(a => a - 1); }
    else setMes(m => m - 1);
  }

  function mesSig() {
    if (mes === 11) { setMes(0); setAnio(a => a + 1); }
    else setMes(m => m + 1);
  }

  function seleccionarDia(d: number) {
    setDiaSelec(d);
    setMesSelec(mes);
    setAnioSelec(anio);
  }

  function confirmar() {
    if (diaSelec && mesSelec !== null && anioSelec) {
      const dd = String(diaSelec).padStart(2, "0");
      const mm = String(mesSelec + 1).padStart(2, "0");
      onConfirm(`${dd}/${mm}/${anioSelec}`);
    }
    onClose();
  }

  const totalDias = diasEnMes(mes, anio);
  const primerDia = primerDiaMes(mes, anio);
  const celdas = primerDia + totalDias;
  const filas = Math.ceil(celdas / 7);
  const hoy = new Date();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={s.overlay} onPress={onClose}>
        <Pressable style={s.card} onPress={() => {}}>
          <View style={s.nav}>
            <TouchableOpacity onPress={mesPrev} style={s.navBtn}>
              <Feather name="chevron-left" size={20} color={colors.foreground} />
            </TouchableOpacity>
            <Text style={s.navTitulo}>{MESES[mes]} {anio}</Text>
            <TouchableOpacity onPress={mesSig} style={s.navBtn}>
              <Feather name="chevron-right" size={20} color={colors.foreground} />
            </TouchableOpacity>
          </View>

          <View style={s.semanaRow}>
            {DIAS_SEMANA.map(d => (
              <Text key={d} style={s.semanaLabel}>{d}</Text>
            ))}
          </View>

          {Array.from({ length: filas }).map((_, fi) => (
            <View key={fi} style={s.fila}>
              {Array.from({ length: 7 }).map((_, ci) => {
                const idx = fi * 7 + ci;
                const dia = idx - primerDia + 1;
                const valido = dia >= 1 && dia <= totalDias;
                const esSelec = valido && dia === diaSelec && mes === mesSelec && anio === anioSelec;
                const esHoy = valido && dia === hoy.getDate() && mes === hoy.getMonth() && anio === hoy.getFullYear();
                return (
                  <TouchableOpacity
                    key={ci}
                    style={[s.dia, esSelec && s.diaSelec, esHoy && !esSelec && s.diaHoy]}
                    onPress={() => valido && seleccionarDia(dia)}
                    disabled={!valido}
                    activeOpacity={valido ? 0.7 : 1}
                  >
                    <Text style={[
                      s.diaTxt,
                      !valido && s.diaVacio,
                      esSelec && s.diaSelecTxt,
                      esHoy && !esSelec && s.diaHoyTxt,
                    ]}>
                      {valido ? dia : ""}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}

          <View style={s.botones}>
            <TouchableOpacity style={[s.btn, s.btnCancelar]} onPress={onClose}>
              <Text style={s.btnCancelarTxt}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.btn, s.btnConfirmar, !diaSelec && s.btnDisabled]}
              onPress={confirmar}
              disabled={!diaSelec}
            >
              <Text style={s.btnConfirmarTxt}>Confirmar</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function makeStyles(colors: ReturnType<typeof useColors>) {
  const CELL = 40;
  return StyleSheet.create({
    overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", alignItems: "center", justifyContent: "center", padding: 20 },
    card: { backgroundColor: colors.card, borderRadius: 18, padding: 20, width: "100%", maxWidth: 360, gap: 10 },
    nav: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 4 },
    navBtn: { padding: 6 },
    navTitulo: { fontSize: 16, fontWeight: "700", color: colors.foreground, fontFamily: "Inter_700Bold" },
    semanaRow: { flexDirection: "row", marginBottom: 2 },
    semanaLabel: { width: CELL, textAlign: "center", fontSize: 11, fontWeight: "600", color: colors.mutedForeground, fontFamily: "Inter_600SemiBold" },
    fila: { flexDirection: "row" },
    dia: { width: CELL, height: CELL, alignItems: "center", justifyContent: "center", borderRadius: CELL / 2 },
    diaSelec: { backgroundColor: colors.primary },
    diaHoy: { borderWidth: 1.5, borderColor: colors.primary },
    diaTxt: { fontSize: 14, color: colors.foreground, fontFamily: "Inter_400Regular" },
    diaVacio: { color: "transparent" },
    diaSelecTxt: { color: "#fff", fontWeight: "700", fontFamily: "Inter_700Bold" },
    diaHoyTxt: { color: colors.primary, fontWeight: "700", fontFamily: "Inter_700Bold" },
    botones: { flexDirection: "row", gap: 10, marginTop: 6 },
    btn: { flex: 1, paddingVertical: 13, borderRadius: 10, alignItems: "center" },
    btnCancelar: { backgroundColor: colors.muted },
    btnCancelarTxt: { fontSize: 14, fontWeight: "600", color: colors.mutedForeground, fontFamily: "Inter_600SemiBold" },
    btnConfirmar: { backgroundColor: colors.primary },
    btnConfirmarTxt: { fontSize: 14, fontWeight: "600", color: "#fff", fontFamily: "Inter_600SemiBold" },
    btnDisabled: { opacity: 0.4 },
  });
}
