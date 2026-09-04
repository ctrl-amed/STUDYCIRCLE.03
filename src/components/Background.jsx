import React from 'react';

export default function Background({ children, showLeaves = false }) {
  return (
    <div className={`bg-theme-muted dark:bg-zinc-900 min-h-screen relative text-theme-dark flex flex-col transition-colors duration-200 ${showLeaves ? 'md:h-screen md:overflow-hidden overflow-x-hidden' : ''}`}>
      
      {/* 1. DECORATIVE LEAVES LAYER (Only renders if showLeaves={true}) */}
      {showLeaves && (
        <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden opacity-60">
          <img src="media/leaves_design.png" alt="" className="absolute top-[3%] left-[12%] w-6 h-6 rotate-[-15deg]" />
          <img src="media/leaves_design.png" alt="" className="absolute top-[4%] right-[15%] w-6 h-6 rotate-45" />
          <img src="media/leaves_design.png" alt="" className="absolute top-[22%] left-[3%] w-5 h-5 rotate-30" />
          <img src="media/leaves_design.png" alt="" className="absolute top-[58%] left-[8%] w-5 h-5 rotate-[-30deg]" />
          <img src="media/leaves_design.png" alt="" className="absolute top-[25%] right-[4%] w-6 h-6 rotate-15" />
          <img src="media/leaves_design.png" alt="" className="absolute top-[60%] right-[7%] w-5 h-5 rotate-60" />
          <img src="media/leaves_design.png" alt="" className="absolute bottom-[12%] left-[42%] w-5 h-5 rotate-10" />
          <img src="media/leaves_design.png" alt="" className="absolute bottom-[4%] left-[48%] w-6 h-6 -rotate-45" />
          <img src="media/leaves_design.png" alt="" className="absolute bottom-[8%] right-[32%] w-5 h-5 rotate-25" />
          <img src="media/leaves_design.png" alt="" className="absolute bottom-[2%] left-[6%] w-6 h-6 rotate-75" />
        </div>
      )}

      {/* 2. FIXED BACKGROUND LINE GRID TEXTURE LAYER */}
      <div 
        className="fixed inset-0 pointer-events-none z-0"
        style={{
          backgroundImage: 'linear-gradient(rgba(61, 32, 19, 0.06) 1px, transparent 1px)',
          backgroundSize: '100% 5px'
        }}
      />

      {/* 3. AMBIENT GLOWS CONTAINER */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div 
          className="absolute right-[20%] sm:right-[25%] md:right-[90%] top-[10%] sm:top-[8%] w-[250px] h-[250px] sm:w-[450px] sm:h-[600px] rounded-full opacity-50 filter blur-3xl mix-blend-multiply dark:mix-blend-screen"
          style={{ background: 'radial-gradient(circle, rgba(253, 146, 62, 0.45) 0%, rgba(253, 146, 62, 0) 70%)' }}
        />
        <div 
          className="absolute left-[20%] sm:left-[25%] md:left-[90%] top-[52%] sm:top-[54%] w-[250px] h-[250px] sm:w-[450px] sm:h-[600px] rounded-full opacity-50 filter blur-3xl mix-blend-multiply dark:mix-blend-screen"
          style={{ background: 'radial-gradient(circle, rgba(253, 146, 62, 0.45) 0%, rgba(253, 146, 62, 0) 70%)' }}
        />
        <div 
          className="absolute left-[70%] sm:left-[75%] md:left-[80%] top-[-5%] w-[300px] h-[300px] sm:w-[500px] sm:h-[500px] rounded-full opacity-45 filter blur-3xl mix-blend-multiply dark:mix-blend-screen"
          style={{ background: 'radial-gradient(circle, rgba(253, 146, 62, 0.4) 0%, rgba(253, 146, 62, 0) 70%)' }}
        />
        <div 
          className="absolute right-[75%] md:right-[85%] bottom-[5%] w-[300px] h-[300px] sm:w-[500px] sm:h-[500px] rounded-full opacity-45 filter blur-3xl mix-blend-multiply dark:mix-blend-screen"
          style={{ background: 'radial-gradient(circle, rgba(253, 146, 62, 0.4) 0%, rgba(253, 146, 62, 0) 70%)' }}
        />
      </div>

      {/* 4. FOREGROUND APP CONTENT */}
      <div className="relative z-10 flex-1 flex flex-col">
        {children}
      </div>

    </div>
  );
}