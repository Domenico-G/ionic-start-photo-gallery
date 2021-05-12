import { ref, onMounted, watch } from "vue";
import {
  Plugins,
  CameraResultType,
  CameraSource,
  CameraPhoto,
  Capacitor,
  FilesystemDirectory,
} from "@capacitor/core";

export function usePhotoGallery() {
  const PHOTO_STORAGE = "photos";
  const { Camera, Filesystem, Storage } = Plugins;
  const photos = ref<Photo[]>([]);

  const cachePhotos = () => {
    Storage.set({
      key: PHOTO_STORAGE,
      value: JSON.stringify(photos.value),
    });
  };

  const convertBlobToBase64 = (blob: Blob) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = reject;
      reader.onload = () => {
        resolve(reader.result);
      };
      reader.readAsDataURL(blob);
    });

  const savePicture = async (
    photo: CameraPhoto,
    fileName: string
  ): Promise<Photo> => {
    // Fetch the photo, read as a blob, then convert to base64 format
    const response = await fetch(photo.webPath!);
    const blob = await response.blob();
    const base64Data = (await convertBlobToBase64(blob)) as string;

    const savedFile = await Filesystem.writeFile({
      path: fileName,
      data: base64Data,
      directory: FilesystemDirectory.Data,
    });

    // Use webPath to display the new image instead of base64 since it's
    // already loaded into memory
    return {
      filepath: fileName,
      webviewPath: photo.webPath,
    };
  };

  const takePhoto = async () => {
    const cameraPhoto = await Camera.getPhoto({
      resultType: CameraResultType.Uri,
      source: CameraSource.Camera,
      quality: 100,
    });
    const fileName = new Date().getTime() + ".jpeg";

    const savedFileImage = await savePicture(cameraPhoto, fileName);

    photos.value = [savedFileImage, ...photos.value];
  };

  watch(photos, cachePhotos);

  const loadSaved = async () => {
    const photoList = await Storage.get({ key: PHOTO_STORAGE });
    const photosInStorage = photoList.value ? JSON.parse(photoList.value) : [];

    for (const photo of photosInStorage) {
      const file = await Filesystem.readFile({
        path: photo.filepath,
        directory: FilesystemDirectory.Data,
      });
      photo.webviewPath = `data:image/jpeg;base64,${file.data}`;
    }

    photos.value = photosInStorage;
  };

  onMounted(loadSaved);

  return {
    photos,
    takePhoto,
  };
}

export interface Photo {
  filepath: string;
  webviewPath?: string;
}
