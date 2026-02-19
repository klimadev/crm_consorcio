import { VIEW_TITLES, type View } from './navigation';

interface MainHeaderProps {
  title: View;
}

export function MainHeader({ title }: MainHeaderProps) {
  return (
    <header className="bg-white border-b border-slate-200 h-16 flex items-center justify-between px-8 flex-shrink-0 z-10 shadow-sm">
      <div className="flex items-center gap-3">
        <h2 className="text-xl font-bold text-slate-800">{VIEW_TITLES[title]}</h2>
      </div>
    </header>
  );
}
