import React from "react";
import clsx from "clsx";

export const Card: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className, ...props}) => (
  <div className={clsx("card", className)} {...props} />
);
export const Button: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & {variant?:"primary"|"ghost"|"accent"}> = ({variant="primary", className, ...props}) => (
  <button className={clsx("btn", variant==="primary" && "btn-primary", variant==="ghost" && "btn-ghost", variant==="accent" && "btn-accent", className)} {...props} />
);
export const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = ({ className, ...p}) => <input className={clsx("input", className)} {...p}/>;
export const Label: React.FC<React.LabelHTMLAttributes<HTMLLabelElement>> = ({ className, ...p}) => <label className={clsx("label", className)} {...p}/>;

export function Table({columns, rows}:{columns:string[]; rows:(string|JSX.Element)[][]}){
  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {columns.map((c,i)=> <th key={i} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">{c}</th>)}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {rows.map((r,ri)=> (
              <tr key={ri} className="hover:bg-gray-50/60">
                {r.map((cell,ci)=> <td key={ci} className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">{cell}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
