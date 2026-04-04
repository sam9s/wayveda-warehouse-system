import { PackagePlus, RotateCcw, Truck } from "lucide-react";
import { NavLink } from "react-router-dom";
import formStyles from "./MovementForms.module.css";

const MOVEMENT_CARDS = [
  {
    description: "Incoming stock with cartons and quantity.",
    icon: PackagePlus,
    to: "/stock-in",
    tone: "stockIn",
    title: "Stock In",
  },
  {
    description: "Outgoing customer orders and manual dispatches.",
    icon: Truck,
    to: "/dispatch",
    tone: "dispatch",
    title: "Dispatch",
  },
  {
    description: "Returned orders classified as right, wrong, or fake.",
    icon: RotateCcw,
    to: "/rto",
    tone: "rto",
    title: "RTO",
  },
];

export function MovementTypeCards() {
  return (
    <div className={formStyles.typeCardRail}>
      {MOVEMENT_CARDS.map((card) => {
        const Icon = card.icon;

        return (
          <NavLink
            className={({ isActive }) =>
              `${formStyles.typeCard} ${formStyles[`tone${card.tone}`]} ${
                isActive ? formStyles.typeCardActive : ""
              }`
            }
            key={card.to}
            to={card.to}
          >
            <div className={formStyles.typeCardIcon}>
              <Icon size={18} />
            </div>
            <div>
              <strong>{card.title}</strong>
              <span>{card.description}</span>
            </div>
          </NavLink>
        );
      })}
    </div>
  );
}
