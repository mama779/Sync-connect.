"use client"

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Sparkles, ArrowRight, ArrowLeft, CheckCircle2, Rocket, Link2, Bot, LayoutTemplate, HelpCircle, Flame } from 'lucide-react'

interface OnboardingGuideModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  autoShowOnFirstVisit?: boolean;
}

const ONBOARDING_STEPS = [
  {
    step: 1,
    title: "¡Bienvenido a SixFigure / SyncConnect! 🚀",
    subtitle: "Tu ecosistema inteligente para escalar negocios digitales sin complicaciones",
    icon: Rocket,
    color: "from-orange-500 to-amber-500",
    content: (
      <div className="space-y-4 text-slate-300 text-sm">
        <p>
          Hemos diseñado esta plataforma para que sea <strong className="text-white">intuitiva, directa y automatizada</strong>. No necesitas conocimientos técnicos avanzados para empezar a generar o vender infoproductos.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          <div className="p-3 bg-slate-900 border border-white/10 rounded-xl space-y-1">
            <span className="text-xs font-bold text-orange-400 block uppercase">💼 Membresía Accesible</span>
            <p className="text-xs text-slate-400">Activación de Afiliados por solo <strong>$6 USD</strong> pago único.</p>
          </div>
          <div className="p-3 bg-slate-900 border border-white/10 rounded-xl space-y-1">
            <span className="text-xs font-bold text-emerald-400 block uppercase">⚡ Enlaces Cycling</span>
            <p className="text-xs text-slate-400">Atribución 100% precisa de comisiones en cada enlace promocional.</p>
          </div>
        </div>
      </div>
    )
  },
  {
    step: 2,
    title: "Tus Enlaces de Afiliado Cycling 🚴‍♂️",
    subtitle: "Comparte tus infoproductos y gana comisiones automáticas",
    icon: Link2,
    color: "from-emerald-500 to-teal-500",
    content: (
      <div className="space-y-4 text-slate-300 text-sm">
        <p>
          En la sección <strong className="text-white">Enlaces Cycling</strong> o en el <strong className="text-white">Catálogo de Productos</strong>, podrás copiar con 1-Click tu enlace personalizado de afiliación.
        </p>
        <div className="p-4 bg-slate-900/90 border border-emerald-500/30 rounded-2xl space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
            <CheckCircle2 className="h-4 w-4" /> Atribución Directa al Instante
          </div>
          <p className="text-xs text-slate-400">
            Cada cliente que ingrese a través de tu enlace Cycling y compre un producto generará una comisión directa transferida a tu balance.
          </p>
        </div>
      </div>
    )
  },
  {
    step: 3,
    title: "Copiloto de IA para Ventas 24/7 🤖",
    subtitle: "Responde objeciones y crea guiones persuasivos automáticamente",
    icon: Bot,
    color: "from-blue-500 to-indigo-500",
    content: (
      <div className="space-y-4 text-slate-300 text-sm">
        <p>
          ¿No sabes qué responder a un cliente exigente o dudoso? Tu <strong className="text-white">Copiloto de Inteligencia Artificial</strong> conoce todos los detalles de los productos del catálogo.
        </p>
        <div className="p-4 bg-slate-900/90 border border-blue-500/30 rounded-2xl space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-blue-400">
            <Sparkles className="h-4 w-4" /> Asistente Inteligente Incluido
          </div>
          <p className="text-xs text-slate-400">
            Pídele al bot: <em>"Escribe un mensaje de WhatsApp para ofrecer el curso de Meta Ads"</em> y generará la respuesta perfecta redactada para ti.
          </p>
        </div>
      </div>
    )
  },
  {
    step: 4,
    title: "Generador de Páginas & Materiales 📄",
    subtitle: "Construye sitios de venta y descarga fotos publicitarias en segundos",
    icon: LayoutTemplate,
    color: "from-purple-500 to-pink-500",
    content: (
      <div className="space-y-4 text-slate-300 text-sm">
        <p>
          Aprovecha el <strong className="text-white">Generador de Páginas con IA</strong> para lanzar aterrizajes de alta conversión y descarga fotos deslizables listas para publicar en Instagram o TikTok.
        </p>
        <div className="p-4 bg-gradient-to-r from-orange-500/10 to-amber-500/10 border border-orange-500/30 rounded-2xl space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-orange-400">
            <Flame className="h-4 w-4 fill-orange-400" /> ¡Todo listo para arrancar!
          </div>
          <p className="text-xs text-slate-300">
            Ya puedes explorar el panel principal. Si deseas consultar esta guía de nuevo en cualquier momento, presiona el botón de soporte o ayuda.
          </p>
        </div>
      </div>
    )
  }
];

export function OnboardingGuideModal({
  isOpen: externalIsOpen,
  onClose: externalOnClose,
  autoShowOnFirstVisit = true
}: OnboardingGuideModalProps) {
  const [open, setOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    if (externalIsOpen !== undefined) {
      setOpen(externalIsOpen);
      return;
    }

    if (autoShowOnFirstVisit) {
      const hasCompleted = localStorage.getItem('sixfigure_onboarding_completed');
      if (!hasCompleted) {
        setOpen(true);
      }
    }
  }, [externalIsOpen, autoShowOnFirstVisit]);

  const handleClose = () => {
    localStorage.setItem('sixfigure_onboarding_completed', 'true');
    setOpen(false);
    if (externalOnClose) externalOnClose();
  };

  const handleNext = () => {
    if (currentStep < ONBOARDING_STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      handleClose();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const activeStepObj = ONBOARDING_STEPS[currentStep];
  const StepIcon = activeStepObj.icon;

  return (
    <Dialog open={open} onOpenChange={(val) => { if (!val) handleClose(); }}>
      <DialogContent className="sm:max-w-[540px] bg-slate-950 border-white/10 text-white p-0 overflow-hidden rounded-3xl shadow-2xl">
        {/* Header Gradient */}
        <div className={`p-6 bg-gradient-to-r ${activeStepObj.color} text-white space-y-3 relative`}>
          <div className="flex items-center justify-between">
            <Badge className="bg-black/40 backdrop-blur-md text-white border-none font-black text-[10px] px-3 py-1 uppercase tracking-widest">
              Paso {currentStep + 1} de {ONBOARDING_STEPS.length}
            </Badge>

            <button
              onClick={handleClose}
              className="text-white/80 hover:text-white text-xs font-bold uppercase tracking-wider px-2 py-1 rounded bg-black/20 hover:bg-black/40 transition-colors"
            >
              Saltar
            </button>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <div className="h-12 w-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0 shadow-lg">
              <StepIcon className="h-6 w-6 text-white" />
            </div>
            <div>
              <DialogTitle className="text-xl font-black tracking-tight text-white leading-tight">
                {activeStepObj.title}
              </DialogTitle>
              <DialogDescription className="text-xs text-white/80 font-medium">
                {activeStepObj.subtitle}
              </DialogDescription>
            </div>
          </div>

          {/* Step Progress Bar */}
          <div className="flex gap-1.5 pt-3">
            {ONBOARDING_STEPS.map((s, idx) => (
              <div 
                key={s.step} 
                className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                  idx <= currentStep ? 'bg-white' : 'bg-white/30'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6">
          {activeStepObj.content}
        </div>

        {/* Modal Footer Controls */}
        <DialogFooter className="p-6 pt-0 flex flex-row items-center justify-between gap-3 border-t border-white/5 bg-slate-950">
          <Button
            onClick={handlePrev}
            disabled={currentStep === 0}
            variant="ghost"
            className="text-slate-400 hover:text-white hover:bg-white/10 text-xs font-bold uppercase tracking-wider rounded-xl h-10 px-4 disabled:opacity-30"
          >
            <ArrowLeft className="h-4 w-4 mr-1.5" /> Anterior
          </Button>

          <Button
            onClick={handleNext}
            className="bg-orange-600 hover:bg-orange-500 text-white font-black text-xs uppercase tracking-wider rounded-xl h-10 px-6 shadow-lg shadow-orange-600/30 transition-transform active:scale-95"
          >
            {currentStep === ONBOARDING_STEPS.length - 1 ? (
              <span className="flex items-center gap-1.5">
                ¡Entendido, Comenzar! <Rocket className="h-4 w-4" />
              </span>
            ) : (
              <span className="flex items-center gap-1.5">
                Siguiente <ArrowRight className="h-4 w-4" />
              </span>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
