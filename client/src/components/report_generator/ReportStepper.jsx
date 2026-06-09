import { IconChart, IconFilter, IconSheet, IconUpload } from './icons';

const STEPS = [
  { id: 1, label: 'Cargar', icon: IconUpload },
  { id: 2, label: 'Filtrar', icon: IconFilter },
  { id: 3, label: 'Tipo', icon: IconSheet },
  { id: 4, label: 'Resultado', icon: IconChart },
];

export default function ReportStepper({ activeStep = 1 }) {
  return (
    <nav className="report-studio-stepper" aria-label="Pasos del informe">
      {STEPS.map((step, i) => {
        const Icon = step.icon;
        const state =
          step.id < activeStep ? 'done' : step.id === activeStep ? 'current' : 'pending';
        return (
          <div key={step.id} className={`report-studio-step is-${state}`}>
            <div className="report-studio-step-marker">
              <Icon />
            </div>
            <span className="report-studio-step-label">{step.label}</span>
            {i < STEPS.length - 1 && <span className="report-studio-step-line" aria-hidden="true" />}
          </div>
        );
      })}
    </nav>
  );
}
