export default function ImprovementTitleTask({
  title,
  task,
}: {
  title: string;
  task: string;
}) {
  return (
    <>
      <span className="text-base font-semibold text-slate-700 min-w-[60px]">
        {title}
      </span>
      <span className="text-base text-slate-800 leading-relaxed">{task}</span>
    </>
  );
}
