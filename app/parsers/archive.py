"""Archive decompression for .gz, .tar.gz, .zip files."""

import gzip
import io
import tarfile
import zipfile


def decompress(content: bytes, filename: str) -> list[tuple[str, bytes]]:
    """Decompress archive and return list of (filename, content) tuples."""
    lower = filename.lower()

    if lower.endswith(".tar.gz") or lower.endswith(".tgz"):
        return _decompress_tar_gz(content)
    elif lower.endswith(".gz"):
        return _decompress_gz(content, filename)
    elif lower.endswith(".zip"):
        return _decompress_zip(content)

    return [(filename, content)]


def _decompress_gz(content: bytes, filename: str) -> list[tuple[str, bytes]]:
    try:
        decompressed = gzip.decompress(content)
        inner_name = filename.rsplit(".gz", 1)[0] or "file"
        return [(inner_name, decompressed)]
    except gzip.BadGzipFile:
        return []


def _decompress_tar_gz(content: bytes) -> list[tuple[str, bytes]]:
    results = []
    try:
        with tarfile.open(fileobj=io.BytesIO(content), mode="r:gz") as tar:
            for member in tar.getmembers():
                if member.isfile():
                    f = tar.extractfile(member)
                    if f:
                        results.append((member.name, f.read()))
    except (tarfile.TarError, gzip.BadGzipFile):
        pass
    return results


def _decompress_zip(content: bytes) -> list[tuple[str, bytes]]:
    results = []
    try:
        with zipfile.ZipFile(io.BytesIO(content)) as zf:
            for name in zf.namelist():
                if not name.endswith("/"):
                    results.append((name, zf.read(name)))
    except zipfile.BadZipFile:
        pass
    return results
