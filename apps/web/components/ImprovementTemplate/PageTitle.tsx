export default function PageTitle({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <>
      <h2 className="text-3xl font-bold text-slate-800">{title}</h2>
      {description && (
        <p className="text-slate-600 text-center mt-1 mb-6">{description}</p>
      )}
    </>
  );
}
