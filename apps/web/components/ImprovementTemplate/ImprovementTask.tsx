export default function ImprovementTask({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div>
      <h3 className="text-lg font-bold mb-3 text-slate-800">{title}</h3>
      <p className="text-base text-slate-700 leading-relaxed">{description}</p>
    </div>
  );
}
