export function SkeletonRow() {
  return (
    <tr className="border-b border-outline-variant/8 animate-pulse">
      <td className="py-4 pl-5 pr-2"><div className="h-4 w-4 rounded bg-surface-container-high" /></td>
      <td className="py-4 px-5"><div className="h-4 w-32 bg-surface-container-high rounded-md" /></td>
      <td className="py-4 px-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-surface-container-high shrink-0" />
          <div className="space-y-2">
            <div className="h-3.5 w-28 bg-surface-container-high rounded" />
            <div className="h-2.5 w-20 bg-surface-container rounded" />
          </div>
        </div>
      </td>
      <td className="py-4 px-5"><div className="h-3.5 w-36 bg-surface-container-high rounded mb-2" /><div className="h-2.5 w-24 bg-surface-container rounded" /></td>
      <td className="py-4 px-5"><div className="h-4 w-20 bg-surface-container-high rounded" /></td>
      <td className="py-4 px-5"><div className="h-6 w-24 bg-surface-container-high rounded-full" /></td>
      <td className="py-4 px-5"><div className="h-6 w-28 bg-surface-container-high rounded-full" /></td>
      <td className="py-4 px-5"><div className="h-3.5 w-20 bg-surface-container-high rounded" /></td>
      <td className="py-4 px-5"><div className="h-3.5 w-20 bg-surface-container-high rounded" /></td>
      <td className="py-4 px-5 text-right"><div className="h-8 w-20 bg-surface-container-high rounded-lg ml-auto" /></td>
    </tr>
  );
}
