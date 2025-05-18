import { 
    collection, 
    doc, 
    getDocs, 
    getDoc, 
    addDoc, 
    updateDoc, 
    deleteDoc, 
    query, 
    where, 
    orderBy,
    writeBatch
  } from "firebase/firestore";
  import { db } from "../config/Firebase";
  import { Tooth, ToothCondition } from "../types/Tooth";
  
  // Convert Firestore data to our Tooth model
  const convertTooth = (doc: any): Tooth => {
    const data = doc.data();
    return {
      id: doc.id,
      position: data.position,
      conditions: data.conditions || [],
      currentCondition: data.currentCondition,
      patientId: data.patientId,
      caseId: data.caseId,
    };
  };
  
  // Get all teeth for a patient
  export const getTeethByPatientId = async (patientId: string): Promise<Tooth[]> => {
    try {
      const q = query(
        collection(db, "teeth"), 
        where("patientId", "==", patientId),
        orderBy("position.quadrant"),
        orderBy("position.number")
      );
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(convertTooth);
    } catch (error) {
      console.error(`Error fetching teeth for patient ${patientId}:`, error);
      throw new Error("Failed to fetch teeth data");
    }
  };
  
  // Get teeth for a specific case
  export const getTeethByCaseId = async (caseId: string): Promise<Tooth[]> => {
    try {
      const q = query(
        collection(db, "teeth"), 
        where("caseId", "==", caseId),
        orderBy("position.quadrant"),
        orderBy("position.number")
      );
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(convertTooth);
    } catch (error) {
      console.error(`Error fetching teeth for case ${caseId}:`, error);
      throw new Error("Failed to fetch teeth data");
    }
  };
  
  // Get a single tooth by ID
  export const getToothById = async (id: string): Promise<Tooth | null> => {
    try {
      const docRef = doc(db, "teeth", id);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return convertTooth(docSnap);
      }
      return null;
    } catch (error) {
      console.error(`Error fetching tooth with ID ${id}:`, error);
      throw new Error("Failed to fetch tooth");
    }
  };
  
  // Add a new tooth
  export const addTooth = async (tooth: Omit<Tooth, 'id'>): Promise<string> => {
    try {
      const docRef = await addDoc(collection(db, "teeth"), tooth);
      return docRef.id;
    } catch (error) {
      console.error("Error adding tooth:", error);
      throw new Error("Failed to add tooth");
    }
  };
  
  // Update tooth condition
  export const updateToothCondition = async (
    id: string, 
    condition: ToothCondition,
    patientId: string,
    caseId?: string
  ): Promise<void> => {
    try {
      // Get the tooth first
      const tooth = await getToothById(id);
      
      if (!tooth) {
        // If tooth doesn't exist, create it
        await addTooth({
          position: {
            quadrant: parseInt(id.charAt(1)) as 1 | 2 | 3 | 4,
            number: parseInt(id.charAt(3))
          },
          conditions: [condition],
          currentCondition: condition,
          patientId,
          caseId
        });
        return;
      }
      
      // Otherwise update existing tooth
      const docRef = doc(db, "teeth", id);
      
      // Add condition to history and set as current
      const conditions = [...(tooth.conditions || []), condition];
      
      await updateDoc(docRef, {
        conditions,
        currentCondition: condition,
        caseId
      });
    } catch (error) {
      console.error(`Error updating tooth condition for ID ${id}:`, error);
      throw new Error("Failed to update tooth condition");
    }
  };
  
  // Delete a tooth
  export const deleteTooth = async (id: string): Promise<void> => {
    try {
      await deleteDoc(doc(db, "teeth", id));
    } catch (error) {
      console.error(`Error deleting tooth with ID ${id}:`, error);
      throw new Error("Failed to delete tooth");
    }
  };


  // Temporary function
  export const generateTeethForCase = async (patientId: string, caseId: string): Promise<void> => {
    try {
      const teeth: Omit<Tooth, 'id'>[] = [];
      const batch = writeBatch(db);

      for (let quadrant = 1; quadrant <= 4; quadrant++) {
        for (let position = 1; position <= 8; position++) {
          const europeanNumber = quadrant * 10 + position;
          
          const isRandomlyHealthy = Math.random() > 0.7;
          
          const tooth: Omit<Tooth, 'id'> = {
            position: {
              quadrant: quadrant as 1 | 2 | 3 | 4,
              number: position
            },
            europeanNumber,
            conditions: [{
              condition: isRandomlyHealthy ? 'healthy' : 'missing',
              notes: '',
              confidence: isRandomlyHealthy ? 100 : 100, 
              date: new Date()
            }],
            currentCondition: {
              condition: isRandomlyHealthy ? 'healthy' : 'missing',
              notes: '',
              confidence: isRandomlyHealthy ? 100 : 100,
              date: new Date()
            },
            patientId,
            caseId
          };
          
          teeth.push(tooth);
        }
      }
      
      // Use a batch write for efficiency
      teeth.forEach(tooth => {
        const newToothRef = doc(collection(db, 'teeth'));
        batch.set(newToothRef, tooth);
      });
      
      await batch.commit();
      console.log(`Successfully created 32 teeth for case ${caseId}`);
      
    } catch (error) {
      console.error('Error generating teeth for case:', error);
      throw error;
    }
  };