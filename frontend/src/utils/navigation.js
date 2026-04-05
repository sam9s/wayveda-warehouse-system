import {
  Activity,
  BarChart3,
  Box,
  Boxes,
  ClipboardPen,
  LayoutDashboard,
  PackagePlus,
  RotateCcw,
  Settings,
  Truck,
  Users,
} from "lucide-react";

const NAVIGATION_GROUPS = [
  {
    label: "Monitor",
    items: [
      {
        description: "Stock health, alerts, and quick actions.",
        eyebrow: "Control Tower",
        icon: LayoutDashboard,
        label: "Dashboard",
        title: "Warehouse Dashboard",
        to: "/dashboard",
      },
      {
        description: "Approved ledger balances and CSV export.",
        eyebrow: "Inventory",
        icon: Boxes,
        label: "Inventory Ledger",
        title: "Inventory Ledger",
        to: "/inventory/ledger",
      },
    ],
  },
  {
    label: "Operations",
    items: [
      {
        description: "Record new inbound stock with cartons and quantity.",
        eyebrow: "Movement Entry",
        icon: PackagePlus,
        label: "Stock In",
        roles: ["admin", "operator"],
        title: "Stock In Entry",
        to: "/stock-in",
      },
      {
        description: "Manual dispatch entry plus read-only Shiprocket sync review.",
        eyebrow: "Movement Entry",
        icon: Truck,
        label: "Dispatch",
        roles: ["admin", "operator"],
        title: "Dispatch Entry",
        to: "/dispatch",
      },
      {
        description: "Classify return-to-origin entries by quality outcome.",
        eyebrow: "Movement Entry",
        icon: RotateCcw,
        label: "RTO",
        roles: ["admin", "operator"],
        title: "RTO Classification",
        to: "/rto",
      },
    ],
  },
  {
    label: "Analysis",
    items: [
      {
        description: "Trend dispatch volume by day, week, or month.",
        eyebrow: "Trend View",
        icon: BarChart3,
        label: "Dispatch Analysis",
        title: "Dispatch Analysis",
        to: "/inventory/dispatch-analysis",
      },
      {
        description: "Track recovered, wrong, and fake returns over time.",
        eyebrow: "Trend View",
        icon: Activity,
        label: "RTO Analysis",
        title: "RTO Analysis",
        to: "/inventory/rto-analysis",
      },
      {
        description: "Review stock-in cartons and quantities received.",
        eyebrow: "Trend View",
        icon: ClipboardPen,
        label: "Stock In Analysis",
        title: "Stock In Analysis",
        to: "/inventory/inward-analysis",
      },
    ],
  },
  {
    label: "Admin",
    items: [
      {
        description: "Create business users and assign application access roles.",
        eyebrow: "Admin Console",
        icon: Users,
        label: "Users",
        roles: ["admin"],
        title: "User Management",
        to: "/admin/users",
      },
      {
        description: "Maintain product metadata, max levels, and carton defaults.",
        eyebrow: "Admin Console",
        icon: Box,
        label: "Products",
        roles: ["admin"],
        title: "Product Management",
        to: "/products",
      },
      {
        description: "Current user, environment health, and operational notes.",
        eyebrow: "Admin Console",
        icon: Settings,
        label: "Settings",
        roles: ["admin"],
        title: "Settings",
        to: "/settings",
      },
    ],
  },
];

export function getNavigationForRole(role = "viewer") {
  return NAVIGATION_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter(
      (item) => !item.roles || role === "system_admin" || item.roles.includes(role)
    ),
  })).filter((group) => group.items.length > 0);
}

export function getPageMetadata(pathname) {
  const flatItems = NAVIGATION_GROUPS.flatMap((group) => group.items);
  const exactMatch = flatItems.find((item) => item.to === pathname);

  if (exactMatch) {
    return exactMatch;
  }

  if (pathname.startsWith("/inventory")) {
    return flatItems.find((item) => item.to === "/inventory/ledger");
  }

  return {
    description: "Operator-focused inventory tooling backed by the live Phase C API.",
    eyebrow: "WayVeda",
    title: "Warehouse System",
  };
}
