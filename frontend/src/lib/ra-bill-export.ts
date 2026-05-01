"use client";

import type {
  StoredRABill,
  StoredRABillMeasurementItem,
  StoredRABillMeasurementRow,
} from "@/lib/ra-bill-history";

function escapeXml(value: string | number | null | undefined) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function formatQty(value: number) {
  return new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  }).format(Number.isFinite(value) ? value : 0);
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(value) ? value : 0);
}

function cell(value: string | number | null | undefined, styleId = "Cell") {
  return `<Cell ss:StyleID="${styleId}"><Data ss:Type="String">${escapeXml(value)}</Data></Cell>`;
}

function row(values: Array<string | number | null | undefined>, styleId?: string) {
  return `<Row>${values.map((value) => cell(value, styleId)).join("")}</Row>`;
}

function blankRow() {
  return "<Row></Row>";
}

function worksheet(name: string, rows: string[]) {
  return `
    <Worksheet ss:Name="${escapeXml(name.slice(0, 31))}">
      <Table>
        ${rows.join("")}
      </Table>
    </Worksheet>
  `;
}

function getDisplayValue(rowData: StoredRABillMeasurementRow, key: string) {
  if (key === "__length") return rowData.length === null || rowData.length === undefined ? "-" : formatQty(Number(rowData.length));
  if (key === "__breadth") return rowData.breadth === null || rowData.breadth === undefined ? "-" : formatQty(Number(rowData.breadth));
  if (key === "__depth") return rowData.depth === null || rowData.depth === undefined ? "-" : formatQty(Number(rowData.depth));
  if (key === "__location") return rowData.locationDescription || "-";

  const value = rowData.customFields?.[key];
  if (value === undefined || value === null || value === "") return "-";
  if (typeof value === "number") return formatQty(value);
  return String(value);
}

function getMeasurementColumns(item: StoredRABillMeasurementItem) {
  if (item.department === "Piping-LHS") {
    return [
      ["Area", "area"],
      ["Doc No.", "doc_no"],
      ["Line No.", "line_no"],
      ["Sheet No.", "sheet_no"],
      ["Rev", "rev"],
      ["MOC", "moc"],
      ["FJ/SJ", "fj_sj"],
      ["Joint No.", "joint_no"],
      ["Spool No.", "spool_no"],
      ["Dia (inch)", "width"],
      ["Thk (mm)", "thickness"],
      ["Schedule", "schedule"],
      ["Joint Type", "joint_type"],
      ["Comp Part 1", "component_part_1"],
      ["Comp Part 2", "component_part_2"],
    ] as const;
  }

  if (item.department === "Piping-Spool Status") {
    return [
      ["Area", "area"],
      ["Drg No.", "drawingNo"],
      ["Rev", "revNo"],
      ["Sheet", "sheetNo"],
      ["Spool", "spoolNo"],
      ["Size", "lineSize"],
      ["Material", "baseMaterial"],
      ["Length", "__length"],
      ["Inch Meter", "inchMeter"],
      ["Surface Area", "surfaceArea"],
      ["Paint", "paintSystem"],
      ["Remarks", "remarks"],
    ] as const;
  }

  if (item.department === "Piping Insulation") {
    return [
      ["Location", "location"],
      ["Drg No.", "drawingNo"],
      ["Sheet No.", "sheetNo"],
      ["MOC", "moc"],
      ["Line Size", "lineSize"],
      ["Pipe OD", "pipeOD"],
      ["Ins Thk", "insulationThickness"],
      ["Ins Type", "insulationType"],
      ["Temp", "temp"],
      ["Pipe Len", "__length"],
      ["RMT", "rmt"],
      ["Area", "area"],
    ] as const;
  }

  if (item.department === "Equipment Insulation") {
    return [
      ["Eqp No", "equipmentNo"],
      ["Eqp Name", "equipmentName"],
      ["Portion", "portion"],
      ["Position", "position"],
      ["Temp (C)", "temp"],
      ["MOC", "moc"],
      ["Ins Type", "insulationType"],
      ["Thk (mm)", "thickness"],
      ["Ins Dia (m)", "insulatedDia"],
      ["H/L (m)", "__length"],
      ["Shell Area", "shellArea"],
      ["Dish Area", "dishArea"],
      ["Other Area", "otherArea"],
    ] as const;
  }

  return [
    ["Description", "__location"],
    ["Mark No.", "mark"],
    ["Length", "__length"],
    ["Width", "width"],
    ["Thk", "thickness"],
    ["Unit Wt", "unit_weight"],
    ["Qty", "qty"],
  ] as const;
}

function buildAbstractRows(bill: StoredRABill) {
  const rows: string[] = [];
  const lines = bill.lineItems || [];
  const totals = bill.totals;

  rows.push(row([`Abstract Sheet - ${bill.raNumber}`], "Title"));
  rows.push(blankRow());
  rows.push(row(["Project", bill.projectName, "Client", bill.clientName], "Header"));
  rows.push(row(["Order Number", bill.orderNumber, "Generated", new Date(bill.generatedAt).toLocaleString("en-IN")], "Header"));
  rows.push(blankRow());
  rows.push(row([
    "PO Sr No",
    "Item Code",
    "Item Description",
    "Unit",
    "Quantity",
    "Bill Break Up",
    "Break up %",
    "Unit Rate",
    "Previous Qty",
    "Previous Amount",
    "This Bill Qty",
    "This Bill Amount",
    "Cumm. Qty",
    "Cumm. Amount",
  ], "Header"));

  lines.forEach((line, index) => {
    rows.push(row([
      index + 1,
      line.itemCode || "-",
      line.description,
      line.unit,
      formatQty(line.quantity),
      line.milestoneName,
      `${line.milestonePercentage}%`,
      formatMoney(line.rate),
      formatQty(line.previousQty),
      formatMoney(line.previousAmount),
      formatQty(line.currentQty),
      formatMoney(line.currentAmount),
      formatQty(line.cumulativeQty),
      formatMoney(line.cumulativeAmount),
    ]));
  });

  if (totals) {
    rows.push(row([
      "TOTAL",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      formatQty(totals.previousQty),
      formatMoney(totals.previousAmount),
      formatQty(totals.currentQty),
      formatMoney(totals.currentAmount),
      formatQty(totals.cumulativeQty),
      formatMoney(totals.cumulativeAmount),
    ], "Header"));
  }

  return rows;
}

function buildMeasurementRows(bill: StoredRABill) {
  const rows: string[] = [];
  const measurementItems = bill.measurementItems || [];

  rows.push(row([`Measurement Sheet Summary - ${bill.raNumber}`], "Title"));
  rows.push(blankRow());

  if (measurementItems.length === 0) {
    rows.push(row(["No measurement rows available."], "Header"));
    return rows;
  }

  measurementItems.forEach((item, itemIndex) => {
    const columns = getMeasurementColumns(item);
    const milestoneHeaders = Array.from(
      new Map(
        item.measurements.flatMap((rowData) =>
          rowData.raBillMilestones.map((entry) => [entry.milestoneKey, entry]),
        ),
      ).values(),
    );

    rows.push(row([`Item ${itemIndex + 1}: ${item.itemCode} - ${item.description}`], "Title"));
    rows.push(row([`Department: ${item.department}`, `Unit: ${item.unit}`], "Header"));
    rows.push(row([
      "Sr.",
      ...columns.map(([label]) => label),
      `Total (${item.unit})`,
      ...milestoneHeaders.map((entry) => `${entry.percentage}% ${entry.milestoneName}`),
    ], "Header"));

    item.measurements.forEach((rowData, rowIndex) => {
      rows.push(row([
        rowIndex + 1,
        ...columns.map(([_, key]) => getDisplayValue(rowData, key)),
        formatQty(Number(rowData.quantity || 0)),
        ...milestoneHeaders.map((entry) => {
          const milestone = rowData.raBillMilestones.find((value) => value.milestoneKey === entry.milestoneKey);
          return milestone?.qty ? formatQty(milestone.qty) : "-";
        }),
      ]));
    });

    const subtotal = item.measurements.reduce(
      (sum, rowData) => sum + rowData.raBillMilestones.reduce((inner, entry) => inner + Number(entry.qty || 0), 0),
      0,
    );

    rows.push(row([`SUBTOTAL - ${item.itemCode}`, formatQty(subtotal)], "Header"));
    rows.push(blankRow());
  });

  rows.push(row(["GRAND TOTAL - ALL ITEMS", `${formatQty(bill.totalQty)} ${bill.unit}`, formatMoney(bill.totalAmount)], "Title"));
  return rows;
}

export function exportRABillToExcel(bill: StoredRABill) {
  const workbook = `<?xml version="1.0"?>
    <?mso-application progid="Excel.Sheet"?>
    <Workbook
      xmlns="urn:schemas-microsoft-com:office:spreadsheet"
      xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:x="urn:schemas-microsoft-com:office:excel"
      xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
      xmlns:html="http://www.w3.org/TR/REC-html40">
      <Styles>
        <Style ss:ID="Default" ss:Name="Normal">
          <Alignment ss:Vertical="Center"/>
          <Borders/>
          <Font ss:FontName="Arial" ss:Size="10"/>
          <Interior/>
          <NumberFormat/>
          <Protection/>
        </Style>
        <Style ss:ID="Cell">
          <Borders>
            <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/>
            <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"/>
            <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"/>
            <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"/>
          </Borders>
        </Style>
        <Style ss:ID="Header">
          <Font ss:FontName="Arial" ss:Size="10" ss:Bold="1"/>
          <Interior ss:Color="#E2E8F0" ss:Pattern="Solid"/>
          <Borders>
            <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/>
            <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"/>
            <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"/>
            <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"/>
          </Borders>
        </Style>
        <Style ss:ID="Title">
          <Font ss:FontName="Arial" ss:Size="12" ss:Bold="1"/>
        </Style>
      </Styles>
      ${worksheet(
        "RA Bill Data",
        [...buildAbstractRows(bill), blankRow(), blankRow(), blankRow(), ...buildMeasurementRows(bill)]
      )}
    </Workbook>`;

  const blob = new Blob([workbook], { type: "application/vnd.ms-excel;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${bill.raNumber}_${bill.projectName.replace(/[^a-z0-9]+/gi, "_")}.xls`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
