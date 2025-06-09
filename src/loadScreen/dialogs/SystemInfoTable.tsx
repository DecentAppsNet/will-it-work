type props = {
  records: Record<string, string>
};

function SystemInfoTable({ records }: props) {
  return (
    <table>
      <thead>
        <tr>
          <th>Property</th>
          <th>Value</th>
        </tr>
      </thead>
      <tbody>
        {Object.entries(records).map(([key, value]) => (
          <tr key={key}>
            <td>{key}</td>
            <td>{value}</td>
          </tr>
        ))}
        {Object.keys(records).length === 0 && (
          <tr>
            <td colSpan={2}>Loading system information...</td>
          </tr>
        )}
      </tbody>
    </table>
  );
}

export default SystemInfoTable;