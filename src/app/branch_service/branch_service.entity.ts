export class BranchServiceMeta {
  public serviceName: string;
  public branchName: string;
  public description: string;
  public categoryName: string;
}

export class BranchService {
  public id: string;
  public branch_id: string;
  public service_id: string; // Service рүү FK
  public min_price: number; // тухайн салбар дахь хамгийн бага үнэ
  public max_price: number; // хамгийн их үнэ
  public pre: number; // урьдчилгаа uneer
  public duration: number; // тухайн салбар дахь үйлчилгээний хугацаа
  public custom_name?: string; // "Үс засалт + угаалга" гэх мэт нэрийг өөрчилж болох
  public custom_description?: string;
  public index?: number; // UI дараалалд ашиглана
  public status?: number;
  public created_by: string;
  public created_at?: Date;
  public updated_at?: Date;
  public meta?: BranchServiceMeta;
}
