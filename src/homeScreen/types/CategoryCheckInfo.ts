type CategoryCheckInfo = {
  summary:string,
  status:"success" | "failed" | "unknown",
  subItems:string[],
  visible:boolean
}

export default CategoryCheckInfo;