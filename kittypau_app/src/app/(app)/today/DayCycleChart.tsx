"use client";
import React, { useRef, useEffect } from "react";
import * as d3 from "d3";
import type { Session, RawReading } from "./useDayCycleData";

interface Props {
  data: {
    points: Array<{ time: Date; weight: number; raw: RawReading }>;
    sessions: Session[];
    domain: [Date, Date];
  };
  height?: number;
  compact?: boolean;
}

type ChartPoint = {
  time: Date;
  weight: number;
  raw: RawReading;
};

export const DayCycleChart: React.FC<Props> = ({
  data,
  height = 320,
  compact = false,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  // Nota: Si persiste el error de d3, asegúrate de haber instalado @types/d3

  useEffect(() => {
    if (!svgRef.current || !data) return;

    const svg = d3.select(svgRef.current);
    // Cancela transiciones en vuelo antes de limpiar para evitar solapamiento
    svg.interrupt().selectAll("*").interrupt();
    svg.selectAll("*").remove();

    const width = svgRef.current.clientWidth;
    const margin = { top: 20, right: 20, bottom: compact ? 10 : 40, left: 40 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const g = svg
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3.scaleTime().domain(data.domain).range([0, innerWidth]);
    const y = d3
      .scaleLinear()
      .domain([0, d3.max(data.points, (d) => d.weight) || 100])
      .range([innerHeight, 0]);

    // 1. Fondo Contextual (Mañana, Día, Tarde, Noche)
    const periods = [
      { h: 6, label: "Mañana", color: "#FFF9C4" }, // Sol naciente
      { h: 12, label: "Día", color: "#E3F2FD" }, // Cielo claro
      { h: 18, label: "Tarde", color: "#F3E5F5" }, // Atardecer
      { h: 22, label: "Noche", color: "#0F172A15" }, // Penumbra técnica
    ];

    periods.forEach((p, i) => {
      const start = new Date(data.domain[0]);
      start.setHours(p.h, 0, 0, 0);
      const end = new Date(start);
      const nextH = periods[(i + 1) % periods.length].h;
      end.setHours(nextH === 6 ? 30 : nextH, 0, 0, 0); // Manejo fin de ciclo

      g.append("rect")
        .attr("x", x(start))
        .attr("y", 0)
        .attr("width", Math.max(0, x(end) - x(start)))
        .attr("height", innerHeight)
        .attr("fill", p.color);
    });

    // 2. Línea de Peso (Sensor)
    const line = d3
      .line<ChartPoint>()
      .x((d) => x(d.time))
      .y((d) => y(d.weight))
      .curve(d3.curveMonotoneX);

    g.append("path")
      .datum(data.points)
      .attr("fill", "none")
      .attr("stroke", "#94a3b8")
      .attr("stroke-width", 2)
      .attr("stroke-dasharray", "4,4")
      .attr("d", line);

    // 2.5 Cursor de Tiempo (Interacción Lab)
    const cursor = g
      .append("line")
      .attr("class", "time-cursor")
      .attr("y1", 0)
      .attr("y2", innerHeight)
      .attr("stroke", "#EC4899")
      .attr("stroke-width", 1)
      .attr("stroke-dasharray", "2,2")
      .style("opacity", 0);

    const focusCircle = g
      .append("circle")
      .attr("r", 4)
      .attr("fill", "#EC4899")
      .style("opacity", 0);

    // 3. Iconos de Sesión (Platos/Agua)
    g.selectAll(".session-icon")
      .data(data.sessions)
      .enter()
      .append("image")
      .attr("class", "session-icon")
      .attr("href", (d) =>
        d.type === "food"
          ? "/illustrations/pink_food_full.png"
          : "/illustrations/green_water_full.png",
      )
      .attr("x", (d) => x(new Date(d.startT)) - 15)
      .attr("y", -50) // Posición inicial por encima del área visible
      .attr("opacity", 0) // Comienza invisible
      .attr("width", (d) => Math.max(28, Math.min(56, d.consumed * 1.8))) // Escala semántica
      .attr("height", (d) => Math.max(28, Math.min(56, d.consumed * 1.8)))
      .style("cursor", "pointer")
      .on("mouseover", (event, d) => {
        if (!tooltipRef.current) return;
        const t = tooltipRef.current;
        t.style.opacity = "1";
        t.innerHTML = `
          <div class="font-bold">${d.type === "food" ? "Alimentación" : "Hidratación"}</div>
          <div class="text-xs">${new Date(d.startT).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
          <div class="text-pink-600 font-bold">${d.consumed.toFixed(1)}${d.type === "food" ? "g" : "ml"}</div>
          <div class="text-[10px] text-slate-400">${d.isConfirmed ? "✓ Confirmado" : "⚡ Detectado"}</div>
        `;
      })
      .on("mousemove", (event) => {
        if (!tooltipRef.current) return;
        tooltipRef.current.style.left = `${event.pageX + 10}px`;
        tooltipRef.current.style.top = `${event.pageY - 40}px`;
      })
      .on("mouseout", () => {
        if (tooltipRef.current) tooltipRef.current.style.opacity = "0";
      })
      .transition() // Iniciamos la animación de entrada
      .duration(1000)
      .delay((d, i) => i * 80) // Efecto escalonado (cascada) para cada icono
      .ease(d3.easeBounceOut) // Simula el rebote del plato al caer
      .attr("y", (d) => y(d.startValue) - 35) // Posición final
      .attr("opacity", 1);

    // Área de captura para el cursor (namespace .chart evita acumulación de listeners)
    svg
      .on("mousemove.chart", (event) => {
        const [mx] = d3.pointer(event, g.node());
        if (mx >= 0 && mx <= innerWidth) {
          cursor.attr("x1", mx).attr("x2", mx).style("opacity", 1);

          const bisect = d3.bisector((d: ChartPoint) => d.time).left;
          const date = x.invert(mx);
          const index = bisect(data.points, date, 1);
          const d = data.points[index - 1];
          if (d) {
            focusCircle
              .attr("cx", x(d.time))
              .attr("cy", y(d.weight))
              .style("opacity", 1);
          }
        }
      })
      .on("mouseleave.chart", () => {
        cursor.style("opacity", 0);
        focusCircle.style("opacity", 0);
      });

    // Eje X
    if (!compact) {
      const formatHour = d3.timeFormat("%H:%M");
      const xAxis = d3
        .axisBottom<Date>(x)
        .ticks(8)
        .tickFormat((value: Date) => formatHour(value));
      g.append("g")
        .attr("transform", `translate(0,${innerHeight})`)
        .call(xAxis)
        .attr("color", "#94a3b8");
    }
  }, [data, height, compact]);

  return (
    <div className="relative w-full group">
      <svg ref={svgRef} className="w-full" style={{ height }} />
      <div
        ref={tooltipRef}
        className="fixed pointer-events-none bg-white/95 backdrop-blur shadow-xl border border-slate-100 rounded-lg p-2 text-sm transition-opacity opacity-0 z-50 min-w-[120px]"
      />
    </div>
  );
};
