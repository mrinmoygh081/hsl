const verifyGSTRecord = async (client, gstNo, invoiceDate) => {
  if (!gstNo) {
    throw new Error("GST number not found in extracted data");
  }

  if (!invoiceDate) {
    throw new Error("Invoice date not found");
  }

  // STEP 1: Check GST number

  const gstQuery = `
    SELECT
      gstrec_id,
      gst_no,
      vendor_code,
      vendor_name,
      gstr_start_date,
      gstr_end_date
    FROM gst_records
    WHERE UPPER(TRIM(gst_no)) = UPPER(TRIM($1))
  `;

  const gstResult = await client.query(gstQuery, [gstNo]);

  if (gstResult.rowCount === 0) {
    return {
      found: false,
      reason: "GST_NOT_FOUND",
      message: "GST number does not exist in GST records",
    };
  }

  // STEP 2: Check invoice date against GST return period

  const gstPeriodQuery = `
    SELECT
      gstrec_id,
      gst_no,
      vendor_code,
      vendor_name,
      gstr_start_date,
      gstr_end_date
    FROM gst_records
    WHERE UPPER(TRIM(gst_no)) = UPPER(TRIM($1))
      AND $2::date >= gstr_start_date
      AND $2::date <= gstr_end_date
    ORDER BY gstr_end_date DESC
    LIMIT 1
  `;

  const gstPeriodResult = await client.query(gstPeriodQuery, [
    gstNo,
    invoiceDate,
  ]);

  if (gstPeriodResult.rowCount === 0) {
    return {
      found: false,
      reason: "GST_DATE_RANGE_INVALID",
      message: "GST return is out of date range for invoice date",
    };
  }

  return {
    found: true,
    reason: null,
    message: "GST record verified successfully",
    record: gstPeriodResult.rows[0],
  };
};

module.exports = {
  verifyGSTRecord,
};
