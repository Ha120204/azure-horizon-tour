export function SkeletonRow() {
  return (
    <tr className="border-b border-outline-variant/8 animate-pulse">
      <td className="py-4 pl-5 pr-2"><div className="h-4 w-4 rounded bg-surface-container-high" /></td>
      <td className="py-4 px-5"><div className="w-16 h-11 bg-surface-container-high rounded-lg" /></td>
      <td className="py-4 px-5"><div className="h-4 w-56 bg-surface-container-high rounded mb-2" /><div className="h-3 w-36 bg-surface-container rounded" /></td>
      <td className="py-4 px-5"><div className="h-6 w-20 bg-surface-container-high rounded-full" /></td>
      <td className="py-4 px-5"><div className="h-3.5 w-24 bg-surface-container-high rounded" /></td>
      <td className="py-4 px-5"><div className="h-3.5 w-16 bg-surface-container-high rounded" /></td>
      <td className="py-4 px-5"><div className="h-6 w-16 bg-surface-container-high rounded-full" /></td>
      <td className="py-4 px-5"><div className="h-8 w-8 bg-surface-container-high rounded-lg" /></td>
      <td className="py-4 px-5 text-right"><div className="h-8 w-24 bg-surface-container-high rounded-lg ml-auto" /></td>
    </tr>
  );
}
