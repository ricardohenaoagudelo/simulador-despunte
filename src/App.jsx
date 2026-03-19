import React, { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "./components/ui/card";
import { Button } from "./components/ui/button";
import { Badge } from "./components/ui/badge";
import { RotateCcw, CheckCircle2, PiggyBank, Scale, Target, Settings2 } from "lucide-react";

const PRICE_PER_KG = 7500;
const FEED_COST_PER_KG = 1800;
const DAYS_EXTRA = 7;
const ADG = 0.82;
const PIGS_PER_PEN = 20;
const LOT_AGES = [147, 154, 160, 167, 174, 181, 188, 195];

function projectedFCR(weight) {
  if (weight < 105) return 2.65;
  if (weight < 115) return 2.95;
  if (weight <= 125) return 3.25;
  return 3.75;
}

function marginalScore(weight, targetWeight) {
  const weightGain = ADG * DAYS_EXTRA;
  const feedConsumed = projectedFCR(weight) * weightGain;
  const margin = weightGain * PRICE_PER_KG - feedConsumed * FEED_COST_PER_KG;

  const optimalMin = targetWeight - 4;
  const optimalMax = targetWeight + 5;

  let marketBonus = 0;
  if (weight >= optimalMin && weight <= optimalMax) marketBonus += 18;
  else if (weight > optimalMax) marketBonus -= 10;
  else if (weight >= targetWeight - 9 && weight < optimalMin) marketBonus += 5;
  else marketBonus -= 12;

  return margin + marketBonus * 1000;
}

function buildPigWeights(lotIndex, penIndex) {
  const base = 96 + lotIndex * 3 + Math.floor(lotIndex / 2);
  return Array.from({ length: PIGS_PER_PEN }, (_, pigIndex) => {
    const progressive = pigIndex * 1.55;
    const penEffect = (penIndex % 5) * 0.7;
    const wave = ((pigIndex + penIndex + lotIndex) % 4) * 0.8;
    return Math.round((base + progressive + penEffect + wave) * 10) / 10;
  });
}

function generatePens(numLots, pensPerLot) {
  return Array.from({ length: numLots }, (_, lotIndex) => {
    const lote = `Lote ${lotIndex + 1}`;
    const edad =
      LOT_AGES[lotIndex] ??
      LOT_AGES[LOT_AGES.length - 1] + (lotIndex - LOT_AGES.length + 1) * 7;

    return Array.from({ length: pensPerLot }, (_, penIndex) => ({
      lote,
      edad,
      corral: `Corral ${lotIndex + 1}${String.fromCharCode(65 + penIndex)}`,
      pigs: buildPigWeights(lotIndex, penIndex),
    }));
  }).flat();
}

function StatPill({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border bg-white/70 px-4 py-3 shadow-sm">
      <div className="rounded-xl bg-slate-100 p-2">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <div className="text-xs text-slate-500">{label}</div>
        <div className="text-lg font-semibold text-slate-900">{value}</div>
      </div>
    </div>
  );
}

function Pig({ pig, selected, onToggle }) {
  const badgeTone =
    pig.category === "Óptimo"
      ? "bg-emerald-100 text-emerald-700"
      : pig.category === "Pasado"
      ? "bg-rose-100 text-rose-700"
      : pig.category === "Intermedio"
      ? "bg-amber-100 text-amber-700"
      : "bg-sky-100 text-sky-700";

  return (
    <motion.button
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => onToggle(pig.id)}
      className={`group relative flex flex-col items-center rounded-2xl border p-3 transition-all ${
        selected
          ? "border-emerald-500 bg-emerald-50 shadow-md"
          : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm"
      } cursor-pointer`}
    >
      <div
        style={{ transform: `scale(${pig.size})` }}
        className="origin-center select-none leading-none transition-transform"
      >
        🐖
      </div>
      <div className="mt-2 text-sm font-semibold text-slate-800">{pig.weight} kg</div>
      <div className="mt-1 text-[11px] text-slate-500">{pig.id}</div>
      <Badge className={`mt-2 rounded-full ${badgeTone}`}>{pig.category}</Badge>
      {selected && (
        <div className="absolute right-2 top-2 rounded-full bg-emerald-500 p-1 text-white">
          <CheckCircle2 className="h-4 w-4" />
        </div>
      )}
    </motion.button>
  );
}

export default function App() {
  const [numLots, setNumLots] = useState(4);
  const [pensPerLot, setPensPerLot] = useState(10);
  const [targetWeight, setTargetWeight] = useState(120);
  const [selectedIds, setSelectedIds] = useState([]);
  const [evaluated, setEvaluated] = useState(false);

  const penConfig = useMemo(() => generatePens(numLots, pensPerLot), [numLots, pensPerLot]);

  const allPigs = useMemo(
    () =>
      penConfig.flatMap((pen) =>
        pen.pigs.map((weight, pigIndex) => {
          const optimalMin = targetWeight - 4;
          const optimalMax = targetWeight + 5;
          return {
            id: `${pen.corral}-${pigIndex + 1}`,
            lote: pen.lote,
            edad: pen.edad,
            corral: pen.corral,
            weight,
            score: marginalScore(weight, targetWeight),
            size: Math.max(0.8, Math.min(1.55, weight / 85)),
            category:
              weight < targetWeight - 9
                ? "Liviano"
                : weight < optimalMin
                ? "Intermedio"
                : weight <= optimalMax
                ? "Óptimo"
                : "Pasado",
          };
        })
      ),
    [penConfig, targetWeight]
  );

  const maxSelection = useMemo(
    () => Math.max(8, Math.round((numLots * pensPerLot) / 1)),
    [numLots, pensPerLot]
  );

  const optimalSet = useMemo(
    () =>
      allPigs
        .slice()
        .sort((a, b) => {
          const distanceA = Math.abs(a.weight - targetWeight);
          const distanceB = Math.abs(b.weight - targetWeight);
          if (distanceA !== distanceB) return distanceA - distanceB;
          return b.score - a.score;
        })
        .slice(0, maxSelection)
        .map((p) => p.id),
    [allPigs, maxSelection, targetWeight]
  );

  const optimalPigs = useMemo(
    () => allPigs.filter((pig) => optimalSet.includes(pig.id)),
    [allPigs, optimalSet]
  );
  const selectedPigs = useMemo(
    () => allPigs.filter((pig) => selectedIds.includes(pig.id)),
    [allPigs, selectedIds]
  );

  const applyScenario = () => {
    setSelectedIds([]);
    setEvaluated(false);
  };

  const togglePig = (id) => {
    setEvaluated(false);
    setSelectedIds((current) => {
      if (current.includes(id)) return current.filter((x) => x !== id);
      if (current.length >= maxSelection) return current;
      return [...current, id];
    });
  };

  const resetGame = () => {
    setSelectedIds([]);
    setEvaluated(false);
  };

  const selectedAvg =
    selectedPigs.length > 0
      ? (
          selectedPigs.reduce((sum, pig) => sum + pig.weight, 0) / selectedPigs.length
        ).toFixed(1)
      : "0.0";

  const accuracy = Math.round(
    (selectedIds.filter((id) => optimalSet.includes(id)).length / maxSelection) * 100
  );
  const selectedScore = selectedPigs.reduce((sum, pig) => sum + pig.score, 0);
  const optimalScore = optimalPigs.reduce((sum, pig) => sum + pig.score, 0);
  const efficiency =
    optimalScore > 0 ? Math.max(0, Math.round((selectedScore / optimalScore) * 100)) : 0;

  const feedback =
    accuracy >= 80
      ? "Excelente despunte: priorizaste muy bien los cerdos listos para mercado."
      : accuracy >= 55
      ? "Buen criterio: estuviste cerca del óptimo, pero dejaste algunos cerdos clave."
      : "El lote todavía te ganó: seleccionaste varios animales fuera del punto más rentable.";

  const lots = Array.from({ length: numLots }, (_, i) => `Lote ${i + 1}`);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-stone-50 to-emerald-50 p-6 text-slate-900">
      <div className="mx-auto max-w-7xl space-y-6">
        <Card className="overflow-hidden rounded-3xl border-0 shadow-xl">
          <div className="bg-gradient-to-r from-emerald-700 via-emerald-600 to-teal-600 p-8 text-white">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <div className="mb-2 text-sm uppercase tracking-[0.2em] text-emerald-100">
                  Simulador Web
                </div>
                <h1 className="text-3xl font-bold md:text-4xl">
                  Despunte estratégico de cerdos
                </h1>
                <p className="mt-3 max-w-3xl text-sm text-emerald-50 md:text-base">
                  Configura cuántos lotes, cuántos corrales y cuál es el peso objetivo. El
                  sistema ajusta automáticamente el escenario, el número de animales a
                  seleccionar y el óptimo teórico de despacho.
                </p>
              </div>
              <div className="flex gap-3">
                <Button
                  onClick={() => setEvaluated(true)}
                  className="rounded-2xl bg-white text-emerald-700 hover:bg-emerald-50"
                >
                  Evaluar selección
                </Button>
                <Button
                  onClick={resetGame}
                  variant="outline"
                  className="rounded-2xl border-white/70 bg-transparent text-white hover:bg-white/10"
                >
                  <RotateCcw className="mr-2 h-4 w-4" /> Reiniciar
                </Button>
              </div>
            </div>
          </div>
        </Card>

        <Card className="rounded-3xl shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings2 className="h-5 w-5" /> Configuración del escenario
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-5">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Número de lotes</label>
                <select
                  value={numLots}
                  onChange={(e) => setNumLots(Number(e.target.value))}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none"
                >
                  {[1, 2, 3, 4].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">
                  Corrales por lote
                </label>
                <select
                  value={pensPerLot}
                  onChange={(e) => setPensPerLot(Number(e.target.value))}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none"
                >
                  {[2, 4, 6, 8, 10].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">
                  Peso objetivo (kg)
                </label>
                <input
                  type="number"
                  min="100"
                  max="140"
                  step="1"
                  value={targetWeight}
                  onChange={(e) => setTargetWeight(Number(e.target.value) || 120)}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">
                  Cerdos por corral
                </label>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-semibold text-slate-800">
                  20
                </div>
              </div>

              <div className="flex items-end">
                <Button
                  onClick={applyScenario}
                  className="w-full rounded-2xl bg-emerald-600 hover:bg-emerald-700"
                >
                  Aplicar escenario
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-5">
          <StatPill
            icon={PiggyBank}
            label="Seleccionados"
            value={`${selectedIds.length}/${maxSelection}`}
          />
          <StatPill icon={Scale} label="Peso promedio" value={`${selectedAvg} kg`} />
          <StatPill icon={Target} label="Acierto vs óptimo" value={`${accuracy}%`} />
          <StatPill
            icon={CheckCircle2}
            label="Eficiencia económica"
            value={`${efficiency}%`}
          />
          <StatPill icon={Target} label="Peso objetivo" value={`${targetWeight} kg`} />
        </div>

        <div className="grid gap-6 xl:grid-cols-4">
          <div className="space-y-6 xl:col-span-3">
            {lots.map((lote) => {
              const pens = penConfig.filter((p) => p.lote === lote);
              const edad = pens[0]?.edad;
              return (
                <div key={lote} className="space-y-3">
                  <h2 className="text-xl font-bold text-slate-800">
                    {lote}{" "}
                    <span className="text-base font-medium text-slate-500">
                      ({edad} días)
                    </span>
                  </h2>
                  <div className="grid gap-4 md:grid-cols-2">
                    {pens.map((pen) => {
                      const pigs = allPigs.filter((p) => p.corral === pen.corral);
                      return (
                        <Card key={pen.corral} className="rounded-3xl border-slate-200 shadow-sm">
                          <CardHeader className="pb-3">
                            <CardTitle className="flex items-center justify-between text-lg">
                              {pen.corral}
                              <Badge className="rounded-full bg-slate-100 text-slate-700">
                                {pigs.length} cerdos
                              </Badge>
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                              {pigs.map((pig) => (
                                <Pig
                                  key={pig.id}
                                  pig={pig}
                                  selected={selectedIds.includes(pig.id)}
                                  onToggle={togglePig}
                                />
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="space-y-6">
            <Card className="rounded-3xl shadow-sm">
              <CardHeader>
                <CardTitle>Reglas rápidas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-slate-600">
                <p>Haz clic sobre los cerdos que enviarías a sacrificio.</p>
                <p>
                  El modelo compara tu selección con una estrategia óptima basada en
                  cercanía al peso objetivo, margen y penalización por dejar animales
                  pasados o sacar animales muy livianos.
                </p>
                <p className="font-semibold text-slate-800">
                  Objetivo: seleccionar {maxSelection} animales alrededor de {targetWeight} kg.
                </p>
                <div className="flex flex-wrap gap-2 pt-2">
                  <Badge className="rounded-full bg-sky-100 text-sky-700">Liviano</Badge>
                  <Badge className="rounded-full bg-amber-100 text-amber-700">
                    Intermedio
                  </Badge>
                  <Badge className="rounded-full bg-emerald-100 text-emerald-700">
                    Óptimo
                  </Badge>
                  <Badge className="rounded-full bg-rose-100 text-rose-700">Pasado</Badge>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-3xl shadow-sm">
              <CardHeader>
                <CardTitle>Tu selección</CardTitle>
              </CardHeader>
              <CardContent className="max-h-[420px] space-y-2 overflow-auto text-sm">
                {selectedPigs.length === 0 ? (
                  <p className="text-slate-500">Aún no has seleccionado cerdos.</p>
                ) : (
                  selectedPigs
                    .slice()
                    .sort((a, b) => b.weight - a.weight)
                    .map((pig) => (
                      <div
                        key={pig.id}
                        className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2"
                      >
                        <span className="font-medium">{pig.id}</span>
                        <span className="text-slate-600">{pig.weight} kg</span>
                      </div>
                    ))
                )}
              </CardContent>
            </Card>

            {evaluated && (
              <Card className="rounded-3xl border-emerald-200 bg-emerald-50/60 shadow-sm">
                <CardHeader>
                  <CardTitle>Resultado</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm text-slate-700">
                  <p className="font-semibold text-slate-900">{feedback}</p>
                  <div>
                    <div className="mb-2 font-semibold text-slate-900">El óptimo era este:</div>
                    <div className="max-h-36 overflow-auto rounded-2xl bg-white/70 p-3">
                      <div className="flex flex-wrap gap-2">
                        {optimalPigs.map((pig) => (
                          <Badge key={pig.id} className="rounded-full bg-emerald-600 text-white">
                            {pig.id} · {pig.weight} kg
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div>
                    <div className="mb-2 font-semibold text-slate-900">
                      Y tú seleccionaste estos:
                    </div>
                    <div className="max-h-36 overflow-auto rounded-2xl bg-white/70 p-3">
                      <div className="flex flex-wrap gap-2">
                        {selectedPigs.map((pig) => (
                          <Badge key={pig.id} className="rounded-full bg-slate-700 text-white">
                            {pig.id} · {pig.weight} kg
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}