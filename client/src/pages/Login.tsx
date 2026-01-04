import { Button } from "@/components/ui/button";
import { getLoginUrl } from "@/const";

/**
 * Página de Login com foto de coqueiros ocupando toda a tela
 * Apenas botão de login, sem card
 */
export default function Login() {
  return (
    <div className="relative w-screen h-screen overflow-hidden">
      {/* Imagem de fundo ocupando TODA a tela */}
      <img 
        src="/coqueiros-banner.webp" 
        alt="Coqueiros - Coco Litorâneo"
        className="absolute inset-0 w-full h-full object-cover"
      />
      
      {/* Overlay gradiente sutil na parte inferior para o botão */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
      
      {/* Apenas o botão posicionado na parte inferior */}
      <div className="absolute inset-x-0 bottom-8 flex justify-center px-4">
        <Button
          onClick={() => {
            window.location.href = getLoginUrl();
          }}
          size="lg"
          className="px-12 py-6 text-lg font-bold rounded-xl shadow-2xl transition-all hover:scale-105"
          style={{
            backgroundColor: '#8B7355', // Marrom coco seco
            color: '#FFFFFF',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#6B5A45'; // Marrom mais escuro no hover
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#8B7355';
          }}
        >
          Entrar no Sistema
        </Button>
      </div>
    </div>
  );
}
