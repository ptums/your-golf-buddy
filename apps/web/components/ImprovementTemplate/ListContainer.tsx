export default function ListContainer({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="bg-white rounded-lg p-4 border ">{children}</div>;
}
