"use client";

interface MobileBottomDockProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  allowedItems: { id: string; label: string; icon: string }[];
  onOpenMenu: () => void;
}

export default function MobileBottomDock({
  activeTab,
  setActiveTab,
  allowedItems,
  onOpenMenu,
}: MobileBottomDockProps) {
  const mainMobileTabs = [
    { id: "overview", label: "Home", icon: "📊" },
    { id: "pos", label: "POS Bill", icon: "🛒" },
    { id: "products", label: "Stock", icon: "📦" },
    { id: "reports", label: "Analytics", icon: "📈" },
  ].filter((tab) => allowedItems.some((item) => item.id === tab.id));

  function handleTabClick(id: string) {
    if (typeof window !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(15);
    }
    setActiveTab(id);
  }

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-charcoal-900/95 border-t border-brass-700/30 backdrop-blur-md px-2 py-1.5 shadow-[0_-4px_20px_rgba(0,0,0,0.5)]">
      <div className="flex items-center justify-around max-w-md mx-auto">
        {mainMobileTabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.id)}
              className={`flex flex-col items-center justify-center py-1 px-3 rounded-control transition-all ${
                isActive
                  ? "text-brass-300 font-bold scale-105"
                  : "text-steel-400 hover:text-parchment"
              }`}
            >
              <span className="text-lg leading-none">{tab.icon}</span>
              <span className="text-[10px] font-ledger mt-1 tracking-tight">
                {tab.label}
              </span>
              {isActive && (
                <div className="h-1 w-4 bg-brass-400 rounded-full mt-0.5 shadow-brass-glow" />
              )}
            </button>
          );
        })}

        <button
          onClick={() => {
            if (typeof window !== "undefined" && "vibrate" in navigator) {
              navigator.vibrate(15);
            }
            onOpenMenu();
          }}
          className="flex flex-col items-center justify-center py-1 px-3 rounded-control text-steel-400 hover:text-parchment transition-all"
        >
          <span className="text-lg leading-none">☰</span>
          <span className="text-[10px] font-ledger mt-1 tracking-tight">Menu</span>
        </button>
      </div>
    </div>
  );
}
