"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { FEATURES } from "./landing-features";

export function FeaturesCarousel() {
  const [index, setIndex] = useState(0);
  const pairCount = Math.ceil(FEATURES.length / 2);

  useEffect(() => {
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % pairCount);
    }, 4500);
    return () => clearInterval(id);
  }, [pairCount]);

  const first = FEATURES[index * 2];
  const second = FEATURES[index * 2 + 1];

  return (
    <section aria-label="Funciones" className="relative">
      <div className="grid gap-6 md:grid-cols-2">
        {first && (
          <motion.article
            key={first.title}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="card-elevated grain relative overflow-hidden p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-black/5"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-accent/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="relative z-10">
              <span className="eyebrow text-accent-text mb-2 block">Función</span>
              <h3 className="text-lg font-semibold tracking-tight text-ink">{first.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{first.desc}</p>
            </div>
          </motion.article>
        )}
        {second && (
          <motion.article
            key={second.title}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="card-elevated grain relative overflow-hidden p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-black/5"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-accent/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="relative z-10">
              <span className="eyebrow text-accent-text mb-2 block">Función</span>
              <h3 className="text-lg font-semibold tracking-tight text-ink">{second.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{second.desc}</p>
            </div>
          </motion.article>
        )}
      </div>

      {/* Dots indicator */}
      <div className="flex justify-center gap-2 mt-8" role="tablist" aria-label="Funciones">
        {Array.from({ length: pairCount }).map((_, i) => (
          <button
            key={i}
            role="tab"
            aria-selected={i === index}
            aria-label={`Ver funciones ${i + 1}`}
            onClick={() => setIndex(i)}
            className={`h-2 w-2 rounded-full transition-all duration-300 ${
              i === index ? "bg-accent w-6" : "bg-border hover:bg-accent/50"
            }`}
          />
        ))}
      </div>
    </section>
  );
}