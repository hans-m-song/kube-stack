import { App as Cdk8sApp } from "cdk8s";
import { Construct } from "constructs";
import { Chart, ChartProps } from "./chart";

export type FunctionalChartContext = { app: App; chart: Chart };

export type FunctionalChart<Output = any> = (
  this: Chart,
  context: FunctionalChartContext
) => Output | Promise<Output>;

const charts = new Map<FunctionalChart, Construct>();
const outputs = new Map<FunctionalChart, any>();

export const useChart = (fn: FunctionalChart) => {
  const chart = charts.get(fn);
  if (!chart) {
    throw new Error(`chart "${fn.name}" does not exist`);
  }

  return chart;
};

export const useChartOutput = <T>(fn: FunctionalChart<T>): T => {
  const output = outputs.get(fn);
  if (!output) {
    throw new Error(`chart "${fn.name}" does not exist`);
  }

  return output;
};

export class App extends Cdk8sApp {
  debug() {
    console.log({ charts, outputs });
  }

  chart(props: ChartProps, fn: FunctionalChart) {
    console.log("instantiating chart", fn.name);

    const exists = charts.has(fn);
    if (exists) {
      throw new Error(`chart "${fn.name}" already exists`);
    }

    const chart = new Chart(this, fn.name, props);
    charts.set(fn, chart);

    const output = fn.bind(chart)({ app: this, chart });
    if (!output) {
      return this;
    }

    if (output instanceof Promise) {
      output.then((data) => outputs.set(fn, data));
    } else {
      outputs.set(fn, output);
    }

    return this;
  }
}
