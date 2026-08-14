import React, { useEffect, useState } from "react";

export function DemoPanel({ demo }) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setStep((current) => (current + 1) % 5), 1200);
    return () => clearInterval(id);
  }, []);

  return (
    <section className="demo-panel">
      <div>
        <h2>{demo.title}</h2>
        <p>{demo.text}</p>
      </div>
      <div className={`mini-sim ${demo.mode}`}>
        {Array.from({ length: 5 }, (_, index) => (
          <span key={index} className={index <= step ? "active" : ""}>{index + 1}</span>
        ))}
      </div>
    </section>
  );
}
