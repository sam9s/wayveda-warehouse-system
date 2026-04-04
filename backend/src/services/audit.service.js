async function writeAuditLog(client, {
  action,
  entityId = null,
  entityType,
  metadata = {},
  newData = null,
  oldData = null,
  userId = null,
}) {
  await client.query(
    `
      INSERT INTO audit_log (
        user_id,
        action,
        entity_type,
        entity_id,
        old_data,
        new_data,
        metadata
      )
      VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7::jsonb)
    `,
    [
      userId,
      action,
      entityType,
      entityId,
      oldData ? JSON.stringify(oldData) : null,
      newData ? JSON.stringify(newData) : null,
      JSON.stringify(metadata),
    ]
  );
}

module.exports = {
  writeAuditLog,
};
