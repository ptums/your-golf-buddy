export default function ClubTitle({ title }: { title: string }) {
  return (
    <div className="mb-6">
      <h2 className="text-2xl font-bold text-orange-700 mb-3">{title}</h2>
    </div>
  );
}
